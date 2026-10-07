import { Body, Controller, Get, HttpCode, Post, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { FindTransactionsDto } from './dto/find-transactions.dto';
import { DeleteTransactionsDto } from './dto/delete-transactions.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('transactions')
@ApiBearerAuth()
@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  @ApiOperation({
    summary: '거래 내역 조회 (카드 그룹·카드·기간 필터)',
    description: '모든 필터는 선택입니다. groupId로 조회하면 해당 그룹에 속한 카드의 거래만 반환합니다. 최신 날짜순으로 정렬됩니다.',
  })
  findAll(@Req() req: any, @Query() query: FindTransactionsDto) {
    return this.transactionsService.findAll(req.user.userId, query);
  }

  @Post('delete')
  @HttpCode(200)
  @ApiOperation({
    summary: '거래 내역 삭제 (단건·일괄)',
    description: 'ids에 담긴 거래 중 본인 거래만 삭제하고 삭제된 건수를 반환합니다. 연결된 피드백도 함께 삭제됩니다.',
  })
  async remove(@Req() req: any, @Body() dto: DeleteTransactionsDto) {
    const count = await this.transactionsService.remove(req.user.userId, dto.ids);
    return { message: `${count}건 삭제 완료`, count };
  }
}
