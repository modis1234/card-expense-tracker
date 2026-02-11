import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { PrismaService } from '../database/prisma.service';
import { AIService } from '../files/ai.service';

@Injectable()
export class GmailService {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private aiService: AIService,
  ) {}

  async syncCardEmails(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.gmailAccessToken) {
      throw new Error('Gmail 연동이 필요합니다. Google 로그인을 다시 해주세요.');
    }

    const oauth2Client = new google.auth.OAuth2(
      this.configService.get('GOOGLE_CLIENT_ID'),
      this.configService.get('GOOGLE_CLIENT_SECRET'),
    );

    oauth2Client.setCredentials({
      access_token: user.gmailAccessToken,
      refresh_token: user.gmailRefreshToken || undefined,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // 카드사 이메일 검색 (디버깅용: 필터 없이 최근 이메일 조회)
    const query = '현대카드 OR hyundaicard OR hyundai card';

    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 50,
    });

    console.log('Gmail API 응답:', JSON.stringify(response.data, null, 2));

    const messages = response.data.messages || [];
    const transactions: any[] = [];

    for (const message of messages) {
      if (!message.id) continue;
      
      const detail = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
        format: 'full',
      });

      const parsed = this.parseCardEmail(detail.data);
      console.log('파싱 결과:', message.id, parsed);
      if (parsed) {
        // DB에 저장
        const cardCompany = await this.prisma.cardCompany.findUnique({
          where: { code: parsed.cardCompany },
        });

        if (cardCompany) {
          // AI로 카테고리 분류
          const categories = await this.prisma.category.findMany({ where: { isActive: true } });
          const categoryNames = categories.map(c => c.name);
          const suggestedCategory = await this.aiService.categorizeTransaction(
            parsed.merchantName,
            categoryNames
          );
          const category = categories.find(c => c.name === suggestedCategory) || categories[0];

          const transaction = await this.prisma.transaction.create({
            data: {
              date: parsed.date,
              merchantName: parsed.merchantName,
              amount: parsed.amount,
              cardCompanyId: cardCompany.id,
              userId: userId,
              categoryId: category.id,
            },
          });

          transactions.push(transaction);
        }
      }
    }

    return transactions;
  }

  private parseCardEmail(message: any) {
    const headers = message.payload.headers;
    const from = headers.find((h: any) => h.name === 'From')?.value || '';
    const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
    const date = headers.find((h: any) => h.name === 'Date')?.value || '';

    // 이메일 본문 추출
    let body = '';
    if (message.payload.body?.data) {
      body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
    } else if (message.payload.parts) {
      const textPart = message.payload.parts.find((p: any) => p.mimeType === 'text/plain');
      if (textPart?.body?.data) {
        body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
      } else {
        // text/html fallback
        const htmlPart = message.payload.parts.find((p: any) => p.mimeType === 'text/html');
        if (htmlPart?.body?.data) {
          body = Buffer.from(htmlPart.body.data, 'base64').toString('utf-8');
        }
      }
    }

    console.log('이메일:', { from, subject, bodyLength: body.length, bodyPreview: body.substring(0, 300) });
    
    // HTML 태그 제거하여 텍스트 추출
    const cheerio = require('cheerio');
    let textBody = body;
    if (body.includes('<html') || body.includes('<HTML') || body.includes('<!doctype') || body.includes('<!DOCTYPE')) {
      const $ = cheerio.load(body);
      textBody = $.text().replace(/\s+/g, ' ');
    }

    console.log('텍스트 본문:', textBody.substring(0, 500));

    // 거래 정보 파싱
    const amountMatch = textBody.match(/(\d{1,3}(,\d{3})*|\d+)원/);
    const merchantMatch = textBody.match(/가맹점[:\s]*([^\n]+)/);

    if (!amountMatch) return null;

    return {
      date: new Date(date),
      merchantName: merchantMatch?.[1]?.trim() || '알 수 없음',
      amount: parseInt(amountMatch[1].replace(/,/g, '')),
      cardCompany: this.detectCardCompany(from),
    };
  }

  private detectCardCompany(from: string): string {
    if (from.includes('hyundai')) return 'HYUNDAI';
    if (from.includes('shinhan')) return 'SHINHAN';
    if (from.includes('samsung')) return 'SAMSUNG';
    if (from.includes('lotte')) return 'LOTTE';
    if (from.includes('kb') || from.includes('kookmin')) return 'KB';
    return 'UNKNOWN';
  }
}
