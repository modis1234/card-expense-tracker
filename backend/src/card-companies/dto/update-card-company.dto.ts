import { PartialType } from '@nestjs/swagger';
import { CreateCardCompanyDto } from './create-card-company.dto';

export class UpdateCardCompanyDto extends PartialType(CreateCardCompanyDto) {}
