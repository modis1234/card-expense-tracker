import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class CreateCardCompanyDto {
  /**
   * 카드사명
   * @example '현대카드'
   */
  @IsString()
  @IsNotEmpty()
  name: string;

  /**
   * 카드사 코드 (엑셀 파일명 식별용)
   * @example 'HYUNDAI'
   */
  @IsString()
  @IsNotEmpty()
  code: string;

  /** 활성화 여부 */
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
