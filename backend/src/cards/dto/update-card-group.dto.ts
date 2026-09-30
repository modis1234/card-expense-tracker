import { PartialType } from '@nestjs/mapped-types';
import { CreateCardGroupDto } from './create-card-group.dto';

export class UpdateCardGroupDto extends PartialType(CreateCardGroupDto) {}
