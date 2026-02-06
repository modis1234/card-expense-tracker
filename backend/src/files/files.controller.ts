import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  ParseFilePipe,
  FileTypeValidator,
  Param,
  Put,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiBody, ApiTags, ApiOperation } from '@nestjs/swagger';
import { FilesService } from './files.service';
import { randomUUID } from 'crypto';

// TODO: 테스트용 임시 userId - 나중에 인증 추가 필요
const TEST_USER_ID = 'test-user-id';

@ApiTags('files')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @ApiOperation({ summary: '카드 거래내역 엑셀 파일 업로드' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { 
        file: { type: 'string', format: 'binary' }
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new FileTypeValidator({
            fileType:
              /application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|application\/vnd\.ms-excel/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    await this.filesService.parseAndSaveExcel(file.buffer, TEST_USER_ID, {
      filename: `${randomUUID()}-${file.originalname}`,
      originalName: file.originalname,
      fileSize: file.size,
    });
    return { message: '파일 업로드 및 저장 완료' };
  }

  @Put('transactions/:id/recategorize')
  @ApiOperation({ summary: '거래 내역 카테고리 재분류 (OpenAI)' })
  async recategorizeTransaction(@Param('id') id: string) {
    const category = await this.filesService.recategorizeTransaction(id);
    return { message: '카테고리 재분류 완료', category };
  }
}
