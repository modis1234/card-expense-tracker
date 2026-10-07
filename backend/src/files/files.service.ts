import { BadGatewayException, BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { PrismaService } from '../database/prisma.service';
import { AIService, CategorizeResult, REVIEW_THRESHOLD } from './ai.service';
import { StatementRow, parseHanaHtml } from './parsers/hana-html.parser';

export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  cardName?: string;
  [key: string]: unknown;
}

@Injectable()
export class FilesService {
  constructor(
    private prisma: PrismaService,
    private aiService: AIService,
  ) {}

  // 엑셀(현대카드) 또는 HTML 명세서(하나카드)를 파싱해 저장하고 저장 건수를 반환
  async parseAndSaveFile(buffer: Buffer, userId: string, fileInfo: { filename: string; originalName: string; fileSize: number }): Promise<number> {
    const isHtml = /\.html?$/i.test(fileInfo.originalName);
    const html = isHtml ? buffer.toString('utf8') : '';
    // HTML은 파일명 대신 본문으로 카드사 판별 (메일에서 저장한 파일명이 제각각이라)
    const cardCompanyCode = isHtml && html.includes('하나카드') ? 'HANA' : this.extractCardCompanyCode(fileInfo.originalName);
    if (isHtml && cardCompanyCode !== 'HANA') throw new BadRequestException('HTML 명세서는 현재 하나카드만 지원합니다.');

    const cardCompany = await this.prisma.cardCompany.findUnique({ where: { code: cardCompanyCode } });
    if (!cardCompany) throw new BadRequestException(`카드사를 찾을 수 없습니다: ${cardCompanyCode} (파일명에 카드사명을 포함하세요)`);

    let validRows: StatementRow[];
    try {
      validRows = isHtml ? parseHanaHtml(html) : this.parseHyundaiExcel(buffer);
    } catch (error) {
      throw new BadRequestException(`명세서 파싱 실패: ${error.message}`);
    }
    if (validRows.length === 0) throw new BadRequestException('파일에서 거래 내역을 찾지 못했습니다.');

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

    // Gemini 카테고리 분류 (선택적)
    let categorizedResults: (CategorizeResult | undefined)[] = [];
    const useAI = process.env.USE_AI_CATEGORIZATION === 'true';
    
    if (useAI) {
      try {
        const categories = await this.prisma.category.findMany({ where: { isActive: true } });
        const categoryNames = categories.map(c => c.name);
        categorizedResults = await this.aiService.categorizeBatch(
          validRows.map((row) => ({ merchantName: row.merchantName })),
          categoryNames
        );
      } catch (error) {
        console.warn('AI 카테고리 분류 실패, 기본 카테고리 사용:', error.message);
      }
    }

    const categories = await this.prisma.category.findMany({ where: { isActive: true } });

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
          needsReview = result.confidence < REVIEW_THRESHOLD;
        } else if (useAI) {
          // AI 분류를 켰는데 결과가 없거나 목록에 없는 카테고리면 기본 카테고리 + 확인 필요
          needsReview = true;
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
    return validRows.length;
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
      .filter((row) => !isNaN(new Date(row.date).getTime()) && row.merchantName)
      .map((row) => ({
        date: new Date(row.date),
        merchantName: String(row.merchantName),
        amount: this.parseAmount(row.amount),
        last4: this.extractLast4(row.cardNumber),
      }));
  }

  private extractCardCompanyCode(filename: string): string {
    const cardMap: Record<string, string[]> = {
      'HYUNDAI': ['현대', 'hyundai'],
      'SHINHAN': ['신한', 'shinhan'],
      'SAMSUNG': ['삼성', 'samsung'],
      'LOTTE': ['롯데', 'lotte'],
      'KB': ['국민', 'kb', 'kookmin'],
      'WOORI': ['우리', 'woori'],
      'HANA': ['하나', 'hana'],
      'NH': ['nh', '농협', 'nonghyup'],
    };

    const lowerFilename = filename.toLowerCase();
    for (const [code, keywords] of Object.entries(cardMap)) {
      if (keywords.some(keyword => lowerFilename.includes(keyword.toLowerCase()))) {
        return code;
      }
    }
    return 'UNKNOWN';
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
          needsReview: result.confidence < REVIEW_THRESHOLD,
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

    // ponytail: 50건씩 순차 호출, 수백 건 이상을 자주 돌리면 병렬화나 백그라운드 작업으로
    const updates: { id: string; categoryId: string; confidence: number }[] = [];
    for (let i = 0; i < transactions.length; i += 50) {
      const chunk = transactions.slice(i, i + 50);
      let results: (CategorizeResult | undefined)[];
      try {
        results = await this.aiService.categorizeBatch(chunk, categoryNames);
      } catch (error) {
        throw new BadGatewayException(`AI 분류 요청 실패: ${error.message}`);
      }
      chunk.forEach((t, j) => {
        const result = results[j];
        const category = result && categories.find((c) => c.name === result.category);
        if (result && category) updates.push({ id: t.id, categoryId: category.id, confidence: result.confidence });
      });
    }

    await this.prisma.$transaction(
      updates.map((u) =>
        this.prisma.transaction.update({
          where: { id: u.id },
          data: { categoryId: u.categoryId, confidence: u.confidence, needsReview: u.confidence < REVIEW_THRESHOLD },
        }),
      ),
    );
    return { total: transactions.length, updated: updates.length };
  }
}
