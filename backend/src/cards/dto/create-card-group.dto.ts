import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateCardGroupDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  color?: string;
}
