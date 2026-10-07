import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { FindTransactionsDto } from './dto/find-transactions.dto';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  // ponytail: 페이지네이션 없음, 거래가 수천 건 넘어가면 take/cursor 추가
  findAll(userId: string, query: FindTransactionsDto) {
    return this.prisma.transaction.findMany({
      where: {
        userId,
        cardId: query.cardId,
        card: query.groupId ? { groupId: query.groupId } : undefined,
        date: {
          gte: query.from ? new Date(query.from) : undefined,
          lte: query.to ? new Date(query.to) : undefined,
        },
      },
      include: { card: { include: { group: true } }, category: true, cardCompany: true },
      orderBy: { date: 'desc' },
    });
  }

  // userId 조건으로 남의 거래는 ID를 알아도 삭제되지 않음
  async remove(userId: string, ids: string[]) {
    const { count } = await this.prisma.transaction.deleteMany({
      where: { id: { in: ids }, userId },
    });
    return count;
  }
}
