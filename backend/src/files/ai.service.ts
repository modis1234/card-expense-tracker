import { Injectable } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';

export interface CategorizeResult {
  category: string;
  confidence: number;
}

// 신뢰도가 이 값 미만이면 needsReview (docs/design/database-schema.md 비즈니스 규칙)
export const REVIEW_THRESHOLD = 0.8;

@Injectable()
export class AIService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({});
  }

  async categorizeTransaction(merchantName: string, categories: string[]): Promise<CategorizeResult> {
    const prompt = `다음 가맹점명을 보고 가장 적절한 카테고리를 선택해주세요.

가맹점명: ${merchantName}
카테고리 목록: ${categories.join(', ')}

응답은 JSON 객체 하나로만 답변하세요: {"category": "<카테고리 목록 중 하나>", "confidence": <0~1 사이 확신도>}`;

    const response = await this.ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    console.log('Gemini 응답:', response.text);
    const parsed = this.parseJson(response.text);
    if (!parsed?.category) return { category: categories[0], confidence: 0 };
    return { category: String(parsed.category).trim(), confidence: this.toConfidence(parsed.confidence) };
  }

  // 결과는 입력 순서와 같은 인덱스로 반환. 응답에서 빠진 항목은 undefined
  async categorizeBatch(transactions: Array<{ merchantName: string }>, categories: string[]): Promise<(CategorizeResult | undefined)[]> {
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

    console.log('Gemini 배치 응답:', response.text);
    const parsed = this.parseJson(response.text);
    const results: (CategorizeResult | undefined)[] = new Array(transactions.length);
    for (const item of Array.isArray(parsed) ? parsed : []) {
      const i = Number(item?.index) - 1;
      if (Number.isInteger(i) && i >= 0 && i < transactions.length && item.category) {
        results[i] = { category: String(item.category).trim(), confidence: this.toConfidence(item.confidence) };
      }
    }
    return results;
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
