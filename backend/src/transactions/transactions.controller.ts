import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { FindTransactionsDto } from './dto/find-transactions.dto';
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
}
