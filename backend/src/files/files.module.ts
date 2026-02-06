import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { DatabaseModule } from '../database/database.module';
import { AIService } from './ai.service';

@Module({
  imports: [DatabaseModule],
  controllers: [FilesController],
  providers: [FilesService, AIService],
  exports: [FilesService],
})
export class FilesModule {}
