import { PartialType } from '@nestjs/swagger';
import { CreateCardGroupDto } from './create-card-group.dto';

export class UpdateCardGroupDto extends PartialType(CreateCardGroupDto) {}
