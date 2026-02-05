import { PartialType } from '@nestjs/mapped-types';
import { CreateCardCompanyDto } from './create-card-company.dto';

export class UpdateCardCompanyDto extends PartialType(CreateCardCompanyDto) {}
