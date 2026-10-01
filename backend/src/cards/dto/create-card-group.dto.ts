import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateCardGroupDto {
  /**
   * 그룹명 (사용자별 중복 불가)
   * @example '개인'
   */
  @IsString()
  @IsNotEmpty()
  name: string;

  /**
   * 화면 표시용 색상
   * @example '#4ECDC4'
   */
  @IsString()
  @IsOptional()
  color?: string;
}
