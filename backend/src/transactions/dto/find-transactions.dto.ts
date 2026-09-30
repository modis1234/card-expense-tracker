import { IsString, IsOptional, IsDateString } from 'class-validator';

export class FindTransactionsDto {
  @IsString()
  @IsOptional()
  groupId?: string;

  @IsString()
  @IsOptional()
  cardId?: string;

  // YYYY-MM-DD
  @IsDateString()
  @IsOptional()
  from?: string;

  @IsDateString()
  @IsOptional()
  to?: string;
}
