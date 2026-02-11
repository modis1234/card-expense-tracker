import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GmailService } from './gmail.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('gmail')
@Controller('gmail')
export class GmailController {
  constructor(private readonly gmailService: GmailService) {}

  @Get('sync')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Gmail에서 카드 거래 내역 동기화' })
  async syncCardEmails(@Req() req: any) {
    const userId = req.user.userId;
    const transactions = await this.gmailService.syncCardEmails(userId);
    return {
      message: '이메일 동기화 완료',
      count: transactions.length,
      transactions,
    };
  }
}
