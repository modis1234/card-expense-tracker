import { IsString, IsOptional } from 'class-validator';

export class UpdateCardDto {
  @IsString()
  @IsOptional()
  alias?: string;

  // null을 보내면 그룹 미지정으로 변경
  @IsString()
  @IsOptional()
  groupId?: string | null;
}
