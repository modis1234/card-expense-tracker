import { Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GmailService } from './gmail.service';

@ApiTags('gmail')
@Controller('gmail')
export class GmailController {
  constructor(private readonly gmailService: GmailService) {}

  @Post('sync')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Gmail에서 카드 명세서 불러오기',
    description:
      '로그인한 Google 계정에서 최근 1년 하나카드 이용대금명세서 메일(최대 12통)을 찾아 업로드와 같은 방식으로 저장합니다. 이미 등록된 청구월 명세서는 건너뜁니다.',
  })
  async syncCardEmails(@Req() req: any) {
    const result = await this.gmailService.importStatements(req.user.userId);
    const saved = result.imported.reduce((sum, i) => sum + i.count, 0);
    const uncategorized = result.imported.reduce((sum, i) => sum + i.uncategorized, 0);
    const aiNote = uncategorized ? ` · AI 분류 실패 ${uncategorized}건(미분류, 거래내역에서 재분류하세요)` : '';
    return {
      message: `메일 ${result.scanned}통 확인 · 명세서 ${result.imported.length}건(거래 ${saved}건) 저장 · ${result.skipped.length}건 건너뜀${aiNote}`,
      ...result,
    };
  }
}
