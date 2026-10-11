import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateTransactionDto {
  /** 바꿀 카테고리 ID (GET /categories). 지정하면 수동 확정으로 보고 확인 필요를 해제 */
  @IsString()
  @IsOptional()
  categoryId?: string;

  /**
   * 메모 (빈 문자열이면 삭제)
   * @example '에어팟 케이스'
   */
  @IsString()
  @MaxLength(200)
  @IsOptional()
  description?: string;
}
