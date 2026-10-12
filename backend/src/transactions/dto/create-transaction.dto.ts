import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateTransactionDto {
  /**
   * 지출일 (YYYY-MM-DD)
   * @example '2026-10-01'
   */
  @IsDateString()
  date: string;

  /**
   * 금액 (원)
   * @example 185000
   */
  @IsInt()
  @Min(1)
  amount: number;

  /**
   * 내용 (가맹점 자리에 표시)
   * @example '10월 관리비'
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  merchantName: string;

  /** 카테고리 ID (GET /categories) */
  @IsString()
  categoryId: string;

  /**
   * 메모
   * @example '전기 포함'
   */
  @IsString()
  @MaxLength(200)
  @IsOptional()
  description?: string;
}
