import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { StatementRow } from './parsers/hana-html.parser';

export interface ExtractedStatement {
  /** 명세서에 적힌 카드사명 (예: '신한카드'), 모르면 null */
  cardCompany: string | null;
  rows: StatementRow[];
}

export interface CategorizeResult {
  category: string;
  confidence: number;
}

// 신뢰도가 이 값 미만이면 needsReview (docs/design/database-schema.md 비즈니스 규칙)
export const REVIEW_THRESHOLD = 0.8;

// 결제수단·결제대행사 이름만 있는 가맹점 토큰 (공백·'주식회사'·'(주)'·'(구)' 제거, 소문자)
// ponytail: 고정 목록, 새 페이·PG사가 보이면 여기에 추가
const PAYMENT_ONLY_TOKENS = new Set([
  '네이버페이',
  '카카오페이',
  '카카오',
  '토스',
  '토스페이',
  '토스페이먼츠',
  '페이코',
  'payco',
  '스마일페이',
  '코페이',
  '갤럭시아',
  '섹타나인',
  'sms결제',
  '다날',
  '페이레터',
  '헥토파이낸셜',
  '이니시스',
  'kg이니시스',
  '나이스정보통신',
  '나이스페이',
  'kicc',
  'kcp',
  'nhnkcp',
  'ksnet',
  '스마트로',
]);

// 예: '네이버페이', '주식회사 카카오_카카오_카카오페이', '코페이_코페이(구)_갤럭시아'
// → 실제 구매처를 알 수 없어 AI가 그럴듯하게 답해도 믿을 근거가 없음
export function isPaymentOnlyMerchant(merchantName: string): boolean {
  const tokens = merchantName
    .split('_')
    .map((t) => t.replace(/주식회사|\(주\)|\(구\)|\s/g, '').toLowerCase())
    .filter(Boolean);
  return tokens.length > 0 && tokens.every((t) => PAYMENT_ONLY_TOKENS.has(t));
}

// 사용자 확인이 필요한 거래: 신뢰도 낮음 또는 결제수단 이름뿐인 가맹점
export function needsReviewFor(merchantName: string, confidence: number): boolean {
  return confidence < REVIEW_THRESHOLD || isPaymentOnlyMerchant(merchantName);
}

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({});
  }

  async categorizeTransaction(
    merchantName: string,
    categories: string[],
  ): Promise<CategorizeResult> {
    const prompt = `다음 가맹점명을 보고 가장 적절한 카테고리를 선택해주세요.

가맹점명: ${merchantName}
카테고리 목록: ${categories.join(', ')}

응답은 JSON 객체 하나로만 답변하세요: {"category": "<카테고리 목록 중 하나>", "confidence": <0~1 사이 확신도>}`;

    const response = await this.ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const parsed = this.parseJson(response.text);
    if (!parsed?.category) {
      this.logger.warn(`Gemini 단건 응답 해석 실패 (응답 ${response.text?.length ?? 0}자)`);
      return { category: categories[0], confidence: 0 };
    }
    return {
      category: String(parsed.category).trim(),
      confidence: this.toConfidence(parsed.confidence),
    };
  }

  // 결과는 입력 순서와 같은 인덱스로 반환. 응답에서 빠진 항목은 undefined
  async categorizeBatch(
    transactions: Array<{ merchantName: string }>,
    categories: string[],
  ): Promise<(CategorizeResult | undefined)[]> {
    const prompt = `다음 가맹점명들을 보고 각각에 가장 적절한 카테고리를 선택해주세요.

가맹점명 목록:
${transactions.map((t, i) => `${i + 1}. ${t.merchantName}`).join('\n')}

카테고리 목록: ${categories.join(', ')}

응답 형식: JSON 배열로만 답변하세요. 각 항목은 {"index": <가맹점 번호>, "category": "<카테고리 목록 중 하나>", "confidence": <0~1 사이 확신도>}`;

    const response = await this.ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const parsed = this.parseJson(response.text);
    // 배열 대신 {"results": [...]}처럼 감싸서 오는 경우도 허용
    const items: any[] = Array.isArray(parsed)
      ? parsed
      : ((Object.values(parsed ?? {}).find(Array.isArray) as any[]) ?? []);
    if (items.length === 0) {
      // 응답 원문은 지출 내역이라 남기지 않고 길이만 기록
      this.logger.warn(`Gemini 일괄 응답 해석 실패 (요청 ${transactions.length}건, 응답 ${response.text?.length ?? 0}자)`);
    }
    const results: (CategorizeResult | undefined)[] = new Array(transactions.length);
    for (const item of items) {
      const i = Number(item?.index) - 1;
      if (Number.isInteger(i) && i >= 0 && i < transactions.length && item.category) {
        results[i] = {
          category: String(item.category).trim(),
          confidence: this.toConfidence(item.confidence),
        };
      }
    }
    return results;
  }

  // 전용 파서가 없는 카드사 명세서(HTML 텍스트·엑셀 CSV·PDF·이미지)에서 거래 추출
  // 형식이 맞지 않는 행은 버리고, 남은 행만 반환
  async extractStatement(input: { text: string } | { data: Buffer; mimeType: string }): Promise<ExtractedStatement> {
    const prompt = `카드 이용대금명세서 또는 카드 이용내역에서 거래를 모두 추출해 JSON 객체 하나로만 답하세요.

{"cardCompany": "<카드사명, 예: 신한카드. 알 수 없으면 null>",
 "billingMonth": "<청구월 YYYY-MM. 이용대금명세서가 아니면 null>",
 "transactions": [{"date": "YYYY-MM-DD", "merchantName": "<가맹점명>", "amount": <이번 달 청구 금액(원, 정수). 할부는 이번 회차 금액, 취소·환불은 음수>, "last4": "<카드번호 끝 4자리, 없으면 null>", "installmentMonths": <할부 개월 수, 일시불이면 null>, "installmentRound": <할부 회차, 없으면 null>}]}

규칙: 소계·합계·결제예정금액 같은 요약 행과 광고·안내 문구는 제외. 이용일에 연도가 없으면 명세서 기간으로 연도를 정하세요.`;

    const response = await this.ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          role: 'user',
          parts:
            'text' in input
              ? [{ text: `${prompt}\n\n${input.text}` }]
              : [{ text: prompt }, { inlineData: { mimeType: input.mimeType, data: input.data.toString('base64') } }],
        },
      ],
      config: { responseMimeType: 'application/json' },
    });

    const parsed = this.parseJson(response.text);
    const billingMonth = /^\d{4}-\d{2}$/.test(parsed?.billingMonth) ? parsed.billingMonth : undefined;
    const rows: StatementRow[] = [];
    for (const t of Array.isArray(parsed?.transactions) ? parsed.transactions : []) {
      const date = new Date(t?.date);
      const amount = Number(t?.amount);
      const merchantName = String(t?.merchantName ?? '').trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(t?.date) || Number.isNaN(date.getTime()) || !merchantName || !Number.isInteger(amount)) continue;
      const months = Number(t.installmentMonths);
      const installment = Number.isInteger(months) && months > 1;
      rows.push({
        date,
        merchantName,
        amount,
        last4: /^\d{4}$/.test(t.last4) ? t.last4 : null,
        installmentMonths: installment ? months : undefined,
        installmentRound: installment && Number(t.installmentRound) > 0 ? Number(t.installmentRound) : undefined,
        billingMonth,
      });
    }
    // 응답 원문은 지출 내역이라 남기지 않고 건수만 기록
    this.logger.log(`Gemini 명세서 추출 ${rows.length}건 (응답 ${response.text?.length ?? 0}자)`);
    const cardCompany = typeof parsed?.cardCompany === 'string' && parsed.cardCompany.trim() ? parsed.cardCompany.trim() : null;
    return { cardCompany, rows };
  }

  private parseJson(text?: string): any {
    try {
      return JSON.parse(text ?? '');
    } catch {
      return null;
    }
  }

  // DECIMAL(3,2) 컬럼에 맞게 0~1 범위, 소수 둘째 자리로 보정
  private toConfidence(value: unknown): number {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.round(Math.min(Math.max(n, 0), 1) * 100) / 100;
  }
}
