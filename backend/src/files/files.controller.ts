import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  ParseFilePipe,
  FileTypeValidator,
  Param,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiBody, ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FilesService } from './files.service';
import { randomUUID } from 'crypto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('files')
@ApiBearerAuth()
@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @ApiOperation({
    summary: '카드 거래내역 파일 업로드 (엑셀 / HTML 명세서)',
    description: '엑셀(.xlsx/.xls)은 파일명에 카드사명(현대/hyundai 등)이 포함되어야 하며 현재 현대카드 형식만 지원합니다. HTML(.html)은 하나카드 이용대금명세서 메일을 저장한 파일을 지원하며 카드사는 본문으로 판별합니다. 카드번호 끝 4자리로 카드를 자동 등록·연결합니다.',
  })
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
    @Req() req: any,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new FileTypeValidator({
            fileType:
              /application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|application\/vnd\.ms-excel|text\/html/,
            // HTML은 매직 넘버가 없어 브라우저가 보낸 mimetype으로 판별
            fallbackToMimetype: true,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const count = await this.filesService.parseAndSaveFile(file.buffer, req.user.userId, {
      filename: `${randomUUID()}-${file.originalname}`,
      originalName: file.originalname,
      fileSize: file.size,
    });
    return { message: `파일 업로드 및 저장 완료 (${count}건)`, count };
  }

  @Put('transactions/:id/recategorize')
  @ApiOperation({ summary: '거래 내역 카테고리 재분류 (Gemini)', description: '가맹점명으로 Gemini에 카테고리를 다시 물어 갱신합니다. 본인 거래만 가능합니다.' })
  async recategorizeTransaction(@Req() req: any, @Param('id') id: string) {
    const category = await this.filesService.recategorizeTransaction(req.user.userId, id);
    return { message: '카테고리 재분류 완료', category };
  }
}
