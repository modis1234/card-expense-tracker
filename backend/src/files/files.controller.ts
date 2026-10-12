import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
  HttpCode,
  Param,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiBody, ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FilesService } from './files.service';
import { randomUUID } from 'node:crypto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RecategorizeTransactionsDto } from './dto/recategorize-transactions.dto';

@ApiTags('files')
@ApiBearerAuth()
@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @ApiOperation({
    summary: '카드 명세서·이용내역 파일 업로드 (HTML / 엑셀 / CSV / PDF / 이미지)',
    description: '암호가 걸린 엑셀은 password 없이 보내면 422를 반환하므로 암호를 받아 다시 보내면 됩니다(암호는 저장·기록하지 않음). 하나카드 HTML 명세서와 현대카드 엑셀은 전용 파서로, 그 외 카드사·형식은 Gemini로 거래를 추출합니다. 카드사는 명세서 내용, 없으면 파일명으로 판별하고 처음 보는 카드사는 자동 등록합니다. 카드번호 끝 4자리로 카드를 자동 등록·연결합니다.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { 
        file: { type: 'string', format: 'binary' },
        password: { type: 'string', description: '암호가 걸린 엑셀의 파일 암호 (422 응답을 받은 뒤 다시 보낼 때)' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Req() req: any,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          // 형식은 FilesService가 확장자로 판별 (매직 넘버 검사는 암호 걸린 xlsx·옛 xls를 application/x-cfb로 보고 거절함)
          // 20MB: Gemini에 파일을 그대로 보내는 요청 한도
          new MaxFileSizeValidator({ maxSize: 20 * 1024 * 1024, message: '파일은 20MB 이하만 업로드할 수 있습니다.' }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body('password') password?: string,
  ) {
    const { count, uncategorized, aiExtracted } = await this.filesService.parseAndSaveFile(
      file.buffer,
      req.user.userId,
      { filename: `${randomUUID()}-${file.originalname}`, originalName: file.originalname, fileSize: file.size },
      password,
    );
    const aiNote = uncategorized ? ` · AI 분류 실패 ${uncategorized}건은 미분류로 저장됨(거래내역에서 재분류하세요)` : '';
    // AI 추출은 행을 빠뜨리거나 더 읽을 수 있어 실제 청구 금액과 대조를 권함
    const extractNote = aiExtracted ? ' · AI로 명세서를 읽었으니 카드사 청구 금액과 합계를 확인하세요' : '';
    return { message: `파일 업로드 및 저장 완료 (${count}건)${aiNote}${extractNote}`, count, uncategorized };
  }

  @Post('transactions/recategorize')
  @HttpCode(200)
  @ApiOperation({
    summary: '거래 내역 일괄 재분류 (Gemini)',
    description: 'ids의 거래(본인 거래만)를 Gemini 일괄 분류로 다시 분류해 카테고리·신뢰도·확인 필요 여부를 갱신합니다. AI 응답이 없거나 목록에 없는 카테고리면 해당 거래는 그대로 둡니다.',
  })
  async recategorizeTransactions(@Req() req: any, @Body() dto: RecategorizeTransactionsDto) {
    const { total, updated } = await this.filesService.recategorizeTransactions(req.user.userId, dto.ids);
    return { message: `${total}건 중 ${updated}건 재분류 완료`, total, updated };
  }

  @Put('transactions/:id/recategorize')
  @ApiOperation({ summary: '거래 내역 카테고리 재분류 (Gemini)', description: '가맹점명으로 Gemini에 카테고리를 다시 물어 갱신합니다. 본인 거래만 가능합니다.' })
  async recategorizeTransaction(@Req() req: any, @Param('id') id: string) {
    const category = await this.filesService.recategorizeTransaction(req.user.userId, id);
    return { message: '카테고리 재분류 완료', category };
  }
}
