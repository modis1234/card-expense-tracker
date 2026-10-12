import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import * as cheerio from 'cheerio';
import * as officeCrypto from 'officecrypto-tool';
import * as XLSX from 'xlsx';
import { PrismaService } from '../database/prisma.service';
import { AIService, CategorizeResult, ExtractedStatement, isPaymentOnlyMerchant, needsReviewFor } from './ai.service';
import { StatementRow, parseHanaHtml } from './parsers/hana-html.parser';

// 카드사 코드 → 표시 이름, 파일명·명세서 카드사명에서 찾을 키워드 (소문자)
// 앞에서부터 찾으므로 겹치는 키워드는 구체적인 쪽을 먼저 (kbank > kb, 토스뱅크 > 토스)
// DB 목록은 migration 20261012100000_seed_card_companies와 맞춤. 여기 없는 금융사는 업로드 때 자동 등록
const CARD_COMPANIES: Record<string, { name: string; keywords: string[] }> = {
  KAKAOBANK: { name: '카카오뱅크', keywords: ['카카오뱅크', 'kakaobank'] },
  KAKAOPAY: { name: '카카오페이', keywords: ['카카오페이', 'kakaopay'] },
  TOSSBANK: { name: '토스뱅크', keywords: ['토스뱅크', 'tossbank'] },
  TOSS: { name: '토스', keywords: ['토스', 'toss'] },
  KBANK: { name: '케이뱅크', keywords: ['케이뱅크', 'kbank'] },
  NAVERPAY: { name: '네이버페이', keywords: ['네이버페이', 'naverpay'] },
  PAYCO: { name: '페이코', keywords: ['페이코', 'payco'] },
  HYUNDAI: { name: '현대카드', keywords: ['현대', 'hyundai'] },
  SHINHAN: { name: '신한카드', keywords: ['신한', 'shinhan'] },
  SAMSUNG: { name: '삼성카드', keywords: ['삼성', 'samsung'] },
  LOTTE: { name: '롯데카드', keywords: ['롯데', 'lotte'] },
  KB: { name: 'KB국민카드', keywords: ['국민', 'kb', 'kookmin'] },
  WOORI: { name: '우리카드', keywords: ['우리', 'woori'] },
  HANA: { name: '하나카드', keywords: ['하나', 'hana'] },
  BC: { name: 'BC카드', keywords: ['비씨', 'bc카드', 'bccard'] },
  NH: { name: 'NH농협카드', keywords: ['농협', 'nonghyup', 'nhcard', 'nh카드', 'nh_'] },
  IBK: { name: 'IBK기업은행', keywords: ['기업은행', 'ibk'] },
  CITI: { name: '씨티카드', keywords: ['씨티', 'citi'] },
  SC: { name: 'SC제일은행', keywords: ['sc제일', '제일은행', 'standardchartered'] },
  SUHYUP: { name: '수협은행', keywords: ['수협', 'suhyup'] },
  KDB: { name: 'KDB산업은행', keywords: ['산업은행', 'kdb'] },
  IM: { name: 'iM뱅크', keywords: ['im뱅크', '대구은행', 'dgb', 'imbank'] },
  BUSAN: { name: 'BNK부산은행', keywords: ['부산은행', 'busanbank'] },
  KYONGNAM: { name: 'BNK경남은행', keywords: ['경남은행', 'knbank'] },
  KWANGJU: { name: '광주은행', keywords: ['광주은행', 'kjbank'] },
  JEONBUK: { name: '전북은행', keywords: ['전북은행', 'jbbank'] },
  JEJU: { name: '제주은행', keywords: ['제주은행', 'jejubank'] },
  POST: { name: '우체국', keywords: ['우체국', 'epost'] },
  MG: { name: 'MG새마을금고', keywords: ['새마을', 'kfcc'] },
  CU: { name: '신협', keywords: ['신협'] },
};

// AI 추출 시 파일 그대로 Gemini에 보내는 형식
const BINARY_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  cardName?: string;
  [key: string]: unknown;
}

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  constructor(
    private prisma: PrismaService,
    private aiService: AIService,
  ) {}

  // 명세서 파일을 파싱해 저장. 저장 건수와 AI 분류 실패(미분류로 저장된) 건수를 반환
  // 하나카드 HTML·현대카드 엑셀은 전용 파서, 그 외 카드사나 형식(PDF·이미지·CSV 등)은 Gemini로 추출
  async parseAndSaveFile(
    upload: Buffer,
    userId: string,
    fileInfo: { filename: string; originalName: string; fileSize: number },
    password?: string,
  ): Promise<{ count: number; uncategorized: number; aiExtracted: boolean }> {
    const name = fileInfo.originalName;
    const buffer = /\.xlsx?$/i.test(name) ? await this.decryptExcel(upload, password) : upload;
    const isHtml = /\.html?$/i.test(name);
    const html = isHtml ? buffer.toString('utf8') : '';
    // HTML은 파일명 대신 본문으로 카드사 판별 (메일에서 저장한 파일명이 제각각이라)
    let cardCompanyCode = isHtml ? (html.includes('하나카드') ? 'HANA' : 'UNKNOWN') : this.extractCardCompanyCode(name);
    let statementCompanyName: string | null = null;

    let validRows: StatementRow[] = [];
    let aiExtracted = false;
    try {
      if (isHtml && cardCompanyCode === 'HANA') validRows = parseHanaHtml(html);
      else if (/\.xlsx?$/i.test(name) && cardCompanyCode === 'HYUNDAI') validRows = this.parseHyundaiExcel(buffer);
    } catch {
      // 전용 파서가 못 읽는 양식이면 아래 AI 추출로
    }
    if (validRows.length === 0) {
      let extracted: ExtractedStatement;
      try {
        extracted = await this.aiService.extractStatement(this.toExtractInput(buffer, name, html));
      } catch (error) {
        if (error instanceof BadRequestException) throw error;
        throw new BadGatewayException(`AI 명세서 읽기 실패: ${error.message}`);
      }
      validRows = extracted.rows;
      aiExtracted = true;
      statementCompanyName = extracted.cardCompany;
      // 명세서에 적힌 카드사명 우선, 없으면 파일명으로
      const fromStatement = this.extractCardCompanyCode(statementCompanyName ?? '');
      if (fromStatement !== 'UNKNOWN') cardCompanyCode = fromStatement;
    }
    if (validRows.length === 0) throw new BadRequestException('파일에서 거래 내역을 찾지 못했습니다.');

    const cardCompany = await this.resolveCardCompany(cardCompanyCode, statementCompanyName);

    // 같은 카드사·청구월 명세서가 이미 있으면 중복 저장하지 않음 (직접 업로드·Gmail 불러오기 공통)
    // ponytail: 청구월이 없는 현대카드 엑셀은 확인 안 함
    const billingMonth = validRows[0].billingMonth;
    if (billingMonth) {
      const existing = await this.prisma.transaction.findFirst({
        where: { userId, cardCompanyId: cardCompany.id, billingMonth },
      });
      if (existing) throw new ConflictException(`이미 등록된 ${cardCompany.name} ${billingMonth} 명세서입니다.`);
    }

    const file = await this.prisma.file.create({
      data: {
        filename: fileInfo.filename,
        originalName: fileInfo.originalName,
        fileSize: fileInfo.fileSize,
        cardCompanyId: cardCompany.id,
        fileUrl: fileInfo.filename,
        userId: userId,
      },
    });

    const defaultCategory = await this.prisma.category.findFirst({ where: { isActive: true } });
    if (!defaultCategory) throw new BadRequestException('활성화된 카테고리가 없습니다. 먼저 카테고리를 생성하세요.');

    // Gemini 카테고리 분류 (선택적). 실패한 거래는 기본 카테고리 + 확인 필요로 저장하고 건수를 알려줌
    const categories = await this.prisma.category.findMany({ where: { isActive: true } });
    const useAI = process.env.USE_AI_CATEGORIZATION === 'true';
    const categorizedResults = useAI
      ? await this.categorizeInChunks(validRows, categories.map((c) => c.name))
      : [];
    let uncategorized = 0;

    // 카드번호 끝 4자리로 카드 연결 (처음 보는 카드는 그룹 미지정으로 자동 등록)
    const cardIdByLast4 = new Map<string, string>();
    for (const last4 of new Set(validRows.map((row) => row.last4))) {
      if (!last4) continue;
      const card = await this.prisma.card.upsert({
        where: { userId_cardCompanyId_last4: { userId: userId, cardCompanyId: cardCompany.id, last4 } },
        update: {},
        create: { userId: userId, cardCompanyId: cardCompany.id, last4 },
      });
      cardIdByLast4.set(last4, card.id);
    }

    await this.prisma.transaction.createMany({
      data: validRows.map((row, index) => {
        let category = defaultCategory;
        let confidence: number | null = null;
        let needsReview = false;

        const result = categorizedResults[index];
        const foundCategory = result && categories.find(c => c.name === result.category);
        if (result && foundCategory) {
          category = foundCategory;
          confidence = result.confidence;
          needsReview = needsReviewFor(row.merchantName, result.confidence);
        } else if (useAI || isPaymentOnlyMerchant(row.merchantName)) {
          // AI 분류를 켰는데 결과가 없거나 목록에 없는 카테고리, 또는 결제수단 이름뿐인 가맹점이면 확인 필요
          needsReview = true;
          if (useAI) uncategorized++;
        }
        
        return {
          date: row.date,
          merchantName: row.merchantName,
          amount: row.amount,
          installmentMonths: row.installmentMonths,
          installmentRound: row.installmentRound,
          originalAmount: row.originalAmount,
          billingMonth: row.billingMonth,
          cardCompanyId: cardCompany.id,
          cardId: cardIdByLast4.get(row.last4 ?? ''),
          userId: userId,
          fileId: file.id,
          categoryId: category.id,
          confidence,
          needsReview,
        };
      }),
    });
    if (uncategorized > 0) this.logger.warn(`AI 분류 실패 ${uncategorized}/${validRows.length}건, 기본 카테고리로 저장`);
    return { count: validRows.length, uncategorized, aiExtracted };
  }

  // Gemini 일괄 분류를 50건씩 나눠 호출하고, 답이 빠진 거래가 있는 묶음은 한 번 더 요청해 결과를 합침
  // 끝내 답을 못 받은 거래는 undefined
  // ponytail: 순차 호출, 수백 건 이상을 자주 돌리면 병렬화나 백그라운드 작업으로
  private async categorizeInChunks(
    items: { merchantName: string }[],
    categoryNames: string[],
  ): Promise<(CategorizeResult | undefined)[]> {
    const results: (CategorizeResult | undefined)[] = [];
    for (let i = 0; i < items.length; i += 50) {
      const chunk = items.slice(i, i + 50);
      const merged: (CategorizeResult | undefined)[] = new Array(chunk.length);
      for (let attempt = 1; attempt <= 2 && merged.filter(Boolean).length < chunk.length; attempt++) {
        try {
          const answer = await this.aiService.categorizeBatch(chunk, categoryNames);
          answer.forEach((r, j) => {
            if (r && !merged[j]) merged[j] = r;
          });
        } catch (error) {
          this.logger.warn(`AI 일괄 분류 요청 실패 (${chunk.length}건, ${attempt}회차): ${error.message}`);
        }
      }
      results.push(...Array.from({ length: chunk.length }, (_, j) => merged[j]));
    }
    return results;
  }

  // Gemini에 보낼 입력: PDF·이미지는 파일 그대로, HTML·엑셀·CSV는 표 구조를 살린 텍스트로
  // ponytail: CSV는 UTF-8만 가정, EUC-KR CSV가 깨지면 인코딩 감지 추가
  private toExtractInput(buffer: Buffer, name: string, html: string): { text: string } | { data: Buffer; mimeType: string } {
    const ext = name.split('.').pop()?.toLowerCase() ?? '';
    if (BINARY_MIME[ext]) return { data: buffer, mimeType: BINARY_MIME[ext] };
    if (html) {
      // 스타일·속성을 버리고 칸은 ' | ', 행은 줄바꿈으로 남겨 토큰을 줄임
      const $ = cheerio.load(html);
      $('script, style').remove();
      $('td, th').append(' | ');
      $('tr, br, p, div, li').append('\n');
      const text = $('body').text().split('\n').map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');
      return { text };
    }
    if (/^(xlsx|xls|csv)$/.test(ext)) {
      let workbook: XLSX.WorkBook;
      try {
        workbook = XLSX.read(buffer, { type: 'buffer' });
      } catch (error) {
        throw new BadRequestException(`엑셀 파일을 열 수 없습니다. (${error.message})`);
      }
      return { text: workbook.SheetNames.map((n) => XLSX.utils.sheet_to_csv(workbook.Sheets[n])).join('\n\n') };
    }
    throw new BadRequestException('지원하지 않는 파일 형식입니다. (HTML, 엑셀, CSV, PDF, 이미지)');
  }

  // 카드사에서 받은 엑셀은 암호가 걸린 경우가 많음. 422는 프론트가 암호 입력창을 띄우는 신호
  // 암호는 복호화에만 쓰고 저장·로그하지 않음
  private async decryptExcel(buffer: Buffer, password?: string): Promise<Buffer> {
    let encrypted = false;
    try {
      encrypted = officeCrypto.isEncrypted(buffer);
    } catch {
      // 엑셀 컨테이너가 아니면 아래 파싱 단계에서 오류 안내
    }
    if (!encrypted) return buffer;
    if (!password) throw new UnprocessableEntityException('암호가 걸린 엑셀입니다. 파일 암호를 입력해 주세요.');
    try {
      return await officeCrypto.decrypt(buffer, { password });
    } catch (error) {
      if (/password/i.test(error.message)) throw new UnprocessableEntityException('엑셀 암호가 맞지 않습니다. 다시 입력해 주세요.');
      throw new BadRequestException(`엑셀 암호를 풀 수 없습니다: ${error.message}`);
    }
  }

  // 등록된 카드사를 코드나 이름으로 찾고, 처음 보는 카드사는 자동 등록
  private async resolveCardCompany(code: string, statementCompanyName: string | null) {
    const known = CARD_COMPANIES[code];
    const name = known?.name ?? statementCompanyName;
    if (!name) throw new BadRequestException('카드사를 판별하지 못했습니다. 파일명에 카드사명을 넣어 주세요. (예: shinhan_202610.pdf)');
    const finalCode = known ? code : name.replace(/\s/g, '').toUpperCase();
    const existing = await this.prisma.cardCompany.findFirst({ where: { OR: [{ code: finalCode }, { name }] } });
    return existing ?? this.prisma.cardCompany.create({ data: { code: finalCode, name } });
  }

  // 현대카드 엑셀: 9행부터 거래, 컬럼 순서 고정
  private parseHyundaiExcel(buffer: Buffer): StatementRow[] {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<any>(sheet, {
      range: 8,
      header: ['date', 'cardNumber', 'merchantName', 'approvalAmount', 'amount', 'vat', 'relation', 'installment', 'status', 'merchantNumber', 'businessNumber']
    });
    return rows
      .filter((row) => !Number.isNaN(new Date(row.date).getTime()) && row.merchantName)
      .map((row) => ({
        date: new Date(row.date),
        merchantName: String(row.merchantName),
        amount: this.parseAmount(row.amount),
        last4: this.extractLast4(row.cardNumber),
      }));
  }

  private extractCardCompanyCode(text: string): string {
    const lower = text.toLowerCase();
    const found = Object.entries(CARD_COMPANIES).find(([, c]) => c.keywords.some((k) => lower.includes(k)));
    return found?.[0] ?? 'UNKNOWN';
  }

  // '1234-****-****-5678' → '5678'
  private extractLast4(cardNumber: unknown): string | null {
    const digits = String(cardNumber ?? '').replace(/\D/g, '');
    return digits.length >= 4 ? digits.slice(-4) : null;
  }

  private parseAmount(value: unknown): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      return Number(value.replace(/[^0-9.-]/g, '')) || 0;
    }
    return 0;
  }

  async recategorizeTransaction(userId: string, transactionId: string): Promise<string> {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id: transactionId, userId },
    });
    if (!transaction) throw new NotFoundException('거래 내역을 찾을 수 없습니다.');

    const categories = await this.prisma.category.findMany({ where: { isActive: true } });
    const categoryNames = categories.map(c => c.name);

    const result = await this.aiService.categorizeTransaction(
      transaction.merchantName,
      categoryNames
    );

    const category = categories.find(c => c.name === result.category);
    if (category) {
      await this.prisma.transaction.update({
        where: { id: transactionId },
        data: {
          categoryId: category.id,
          confidence: result.confidence,
          needsReview: needsReviewFor(transaction.merchantName, result.confidence),
        },
      });
    }

    return result.category;
  }

  // 여러 거래를 Gemini 일괄 분류로 재분류. AI가 답하지 않았거나 목록에 없는 카테고리를 준 거래는 그대로 둠
  async recategorizeTransactions(userId: string, ids: string[]): Promise<{ total: number; updated: number }> {
    const transactions = await this.prisma.transaction.findMany({
      where: { id: { in: ids }, userId },
      select: { id: true, merchantName: true },
    });
    if (transactions.length === 0) throw new NotFoundException('거래 내역을 찾을 수 없습니다.');

    const categories = await this.prisma.category.findMany({ where: { isActive: true } });
    const categoryNames = categories.map((c) => c.name);

    const results = await this.categorizeInChunks(transactions, categoryNames);
    const updates: { id: string; categoryId: string; confidence: number; needsReview: boolean }[] = [];
    transactions.forEach((t, j) => {
      const result = results[j];
      const category = result && categories.find((c) => c.name === result.category);
      if (result && category)
        updates.push({
          id: t.id,
          categoryId: category.id,
          confidence: result.confidence,
          needsReview: needsReviewFor(t.merchantName, result.confidence),
        });
    });

    await this.prisma.$transaction(
      updates.map((u) =>
        this.prisma.transaction.update({
          where: { id: u.id },
          data: { categoryId: u.categoryId, confidence: u.confidence, needsReview: u.needsReview },
        }),
      ),
    );
    return { total: transactions.length, updated: updates.length };
  }
}
