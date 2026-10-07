import { IsString, IsOptional, IsDateString } from 'class-validator';

export class FindTransactionsDto {
  /** 카드 그룹 ID — 해당 그룹에 속한 카드의 거래만 조회 */
  @IsString()
  @IsOptional()
  groupId?: string;

  /** 카드 ID — 특정 카드의 거래만 조회 */
  @IsString()
  @IsOptional()
  cardId?: string;

  /**
   * 조회 시작일 (포함)
   * @example '2026-01-01'
   */
  @IsDateString()
  @IsOptional()
  from?: string;

  /**
   * 조회 종료일 (포함)
   * @example '2026-01-31'
   */
  @IsDateString()
  @IsOptional()
  to?: string;
}
