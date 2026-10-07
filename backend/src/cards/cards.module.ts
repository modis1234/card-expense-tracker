import { Module } from '@nestjs/common';
import { CardsController } from './cards.controller';
import { CardGroupsController } from './card-groups.controller';
import { CardsService } from './cards.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [CardsController, CardGroupsController],
  providers: [CardsService],
  exports: [CardsService],
})
export class CardsModule {}
