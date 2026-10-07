import { IsString, IsNotEmpty, IsOptional, Matches } from 'class-validator';

export class CreateCardDto {
  /** 카드사 ID (GET /card-companies) */
  @IsString()
  @IsNotEmpty()
  cardCompanyId: string;

  /**
   * 카드번호 끝 4자리 (카드번호 전체는 저장하지 않음)
   * @example '1234'
   */
  @Matches(/^\d{4}$/, { message: 'last4는 숫자 4자리여야 합니다.' })
  last4: string;

  /**
   * 카드 별칭
   * @example '현대 M카드'
   */
  @IsString()
  @IsOptional()
  alias?: string;

  /** 소속 카드 그룹 ID (GET /card-groups) */
  @IsString()
  @IsOptional()
  groupId?: string;
}
