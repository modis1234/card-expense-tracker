import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { FindTransactionsDto } from './dto/find-transactions.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

const INCLUDE = { card: { include: { group: true } }, category: true, cardCompany: true } as const;

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
      include: INCLUDE,
      orderBy: { date: 'desc' },
    });
  }

  // 카테고리를 바꾸면 사람이 확정한 것으로 보고 AI 신뢰도를 지우고 확인 필요 해제
  async update(userId: string, id: string, dto: UpdateTransactionDto) {
    const transaction = await this.prisma.transaction.findFirst({ where: { id, userId } });
    if (!transaction) throw new NotFoundException('거래 내역을 찾을 수 없습니다.');
    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: dto.categoryId, isActive: true },
      });
      if (!category) throw new BadRequestException('존재하지 않는 카테고리입니다.');
    }
    return this.prisma.transaction.update({
      where: { id },
      data: {
        ...(dto.categoryId && { categoryId: dto.categoryId, confidence: null, needsReview: false }),
        ...(dto.description !== undefined && { description: dto.description.trim() || null }),
      },
      include: INCLUDE,
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
