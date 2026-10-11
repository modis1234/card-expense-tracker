import { Module } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { CategoriesController } from './categories.controller';
import { TransactionsService } from './transactions.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [TransactionsController, CategoriesController],
  providers: [TransactionsService],
})
export class TransactionsModule {}
