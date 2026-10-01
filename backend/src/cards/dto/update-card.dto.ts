import { IsString, IsOptional } from 'class-validator';

export class UpdateCardDto {
  /**
   * 카드 별칭
   * @example '개인카드'
   */
  @IsString()
  @IsOptional()
  alias?: string;

  /** 소속 카드 그룹 ID. null을 보내면 그룹 미지정으로 변경 */
  @IsString()
  @IsOptional()
  groupId?: string | null;
}
