import { Module } from '@nestjs/common';
import { GmailController } from './gmail.controller';
import { GmailService } from './gmail.service';
import { DatabaseModule } from '../database/database.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [DatabaseModule, FilesModule],
  controllers: [GmailController],
  providers: [GmailService],
  exports: [GmailService],
})
export class GmailModule {}
