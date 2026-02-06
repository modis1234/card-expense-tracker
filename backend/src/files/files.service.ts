import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { PrismaService } from '../database/prisma.service';
import { AIService } from './ai.service';

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

  async parseAndSaveExcel(buffer: Buffer, userId: string | null, fileInfo: { filename: string; originalName: string; fileSize: number }): Promise<void> {
    // 테스트용: userId가 없거나 유효하지 않으면 첫 번째 유저 사용
    let validUserId: string;
    if (!userId || !(await this.prisma.user.findUnique({ where: { id: userId } }))) {
      const firstUser = await this.prisma.user.findFirst();
      if (!firstUser) throw new Error('등록된 사용자가 없습니다. 먼저 회원가입하세요.');
      validUserId = firstUser.id;
    } else {
      validUserId = userId;
    }
    
    const cardCompanyCode = this.extractCardCompanyCode(fileInfo.originalName);
    const cardCompany = await this.prisma.cardCompany.findUnique({ where: { code: cardCompanyCode } });
    if (!cardCompany) throw new Error(`카드사를 찾을 수 없습니다: ${cardCompanyCode}`);
    
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    const rows = XLSX.utils.sheet_to_json(sheet, { 
      range: 8,
      header: ['date', 'cardNumber', 'merchantName', 'approvalAmount', 'amount', 'vat', 'relation', 'installment', 'status', 'merchantNumber', 'businessNumber']
    });

    const file = await this.prisma.file.create({
      data: {
        filename: fileInfo.filename,
        originalName: fileInfo.originalName,
        fileSize: fileInfo.fileSize,
        cardCompanyId: cardCompany.id,
        fileUrl: fileInfo.filename,
        userId: validUserId,
      },
    });

    const defaultCategory = await this.prisma.category.findFirst({ where: { isActive: true } });
    if (!defaultCategory) throw new Error('활성화된 카테고리가 없습니다. 먼저 카테고리를 생성하세요.');

    const validRows = rows.filter((row: any) => {
      const date = new Date(row.date);
      return !isNaN(date.getTime()) && row.merchantName;
    });

    // OpenAI 카테고리 분류 (선택적)
    let categorizedResults: string[] = [];
    const useAI = process.env.USE_AI_CATEGORIZATION === 'true';
    
    if (useAI) {
      try {
        const categories = await this.prisma.category.findMany({ where: { isActive: true } });
        const categoryNames = categories.map(c => c.name);
        categorizedResults = await this.aiService.categorizeBatch(
          validRows.map((row: any) => ({ merchantName: row.merchantName })),
          categoryNames
        );
      } catch (error) {
        console.warn('AI 카테고리 분류 실패, 기본 카테고리 사용:', error.message);
      }
    }

    const categories = await this.prisma.category.findMany({ where: { isActive: true } });

    await this.prisma.transaction.createMany({
      data: validRows.map((row: any, index: number) => {
        let category = defaultCategory;
        
        if (categorizedResults[index]) {
          const foundCategory = categories.find(c => c.name === categorizedResults[index]);
          if (foundCategory) category = foundCategory;
        }
        
        return {
          date: new Date(row.date),
          merchantName: row.merchantName || '',
          amount: this.parseAmount(row.amount),
          cardCompanyId: cardCompany.id,
          userId: validUserId,
          fileId: file.id,
          categoryId: category.id,
        };
      }),
    });
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

  private parseAmount(value: unknown): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      return Number(value.replace(/[^0-9.-]/g, '')) || 0;
    }
    return 0;
  }

  async recategorizeTransaction(transactionId: string): Promise<string> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });
    if (!transaction) throw new Error('거래 내역을 찾을 수 없습니다.');

    const categories = await this.prisma.category.findMany({ where: { isActive: true } });
    const categoryNames = categories.map(c => c.name);

    const suggestedCategory = await this.aiService.categorizeTransaction(
      transaction.merchantName,
      categoryNames
    );

    const category = categories.find(c => c.name === suggestedCategory);
    if (category) {
      await this.prisma.transaction.update({
        where: { id: transactionId },
        data: { categoryId: category.id },
      });
    }

    return suggestedCategory;
  }
}
