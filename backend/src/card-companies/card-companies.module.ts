import { Module } from '@nestjs/common';
import { CardCompaniesController } from './card-companies.controller';
import { CardCompaniesService } from './card-companies.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [CardCompaniesController],
  providers: [CardCompaniesService],
  exports: [CardCompaniesService],
})
export class CardCompaniesModule {}
