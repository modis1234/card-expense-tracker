import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class CreateCardCompanyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
