import { Injectable } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class AIService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({});
  }

  async categorizeTransaction(merchantName: string, categories: string[]): Promise<string> {
    const prompt = `다음 가맹점명을 보고 가장 적절한 카테고리를 선택해주세요.

가맹점명: ${merchantName}
카테고리 목록: ${categories.join(', ')}

응답은 반드시 카테고리 목록 중 하나만 정확히 반환해주세요. 다른 설명 없이 카테고리명만 답변하세요.`;

    const response = await this.ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    console.log('Gemini 응답:', response.text);
    return response.text?.trim() || categories[0];
  }

  async categorizeBatch(transactions: Array<{ merchantName: string }>, categories: string[]): Promise<string[]> {
    const prompt = `다음 가맹점명들을 보고 각각에 가장 적절한 카테고리를 선택해주세요.

가맹점명 목록:
${transactions.map((t, i) => `${i + 1}. ${t.merchantName}`).join('\n')}

카테고리 목록: ${categories.join(', ')}

응답 형식: 각 줄에 카테고리명만 순서대로 작성 (번호나 다른 텍스트 없이)`;

    const response = await this.ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    console.log('Gemini 배치 응답:', response.text);
    const text = response.text?.trim() || '';
    return text.split('\n').map(cat => cat.trim()).filter(Boolean);
  }
}
