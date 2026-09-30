import { IsString, IsNotEmpty, IsOptional, Matches } from 'class-validator';

export class CreateCardDto {
  @IsString()
  @IsNotEmpty()
  cardCompanyId: string;

  // 카드번호 전체는 저장하지 않고 끝 4자리만 받는다
  @Matches(/^\d{4}$/, { message: 'last4는 숫자 4자리여야 합니다.' })
  last4: string;

  @IsString()
  @IsOptional()
  alias?: string;

  @IsString()
  @IsOptional()
  groupId?: string;
}
