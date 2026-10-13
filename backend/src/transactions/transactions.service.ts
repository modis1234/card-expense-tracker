import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
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
        // 그룹 조회는 소유자 또는 공유받은 멤버 모두 가능 (그룹 카드의 거래는 소유자 것이라 userId 조건 없음)
        ...(query.groupId
          ? { card: { groupId: query.groupId, group: { OR: [{ userId }, { members: { some: { userId } } }] } } }
          : { userId }),
        cardId: query.cardId,
        date: {
          gte: query.from ? new Date(query.from) : undefined,
          lte: query.to ? new Date(query.to) : undefined,
        },
      },
      include: INCLUDE,
      orderBy: { date: 'desc' },
    });
  }

  // 카드 명세서에 없는 지출(관리비·대출이자 등) 직접 입력: 사람이 고른 카테고리라 확인 필요 없음
  async create(userId: string, dto: CreateTransactionDto) {
    await this.assertCategory(dto.categoryId);
    return this.prisma.transaction.create({
      data: {
        userId,
        date: new Date(dto.date),
        amount: dto.amount,
        merchantName: dto.merchantName.trim(),
        categoryId: dto.categoryId,
        description: dto.description?.trim() || null,
      },
      include: INCLUDE,
    });
  }

  // 카테고리를 바꾸면 사람이 확정한 것으로 보고 AI 신뢰도를 지우고 확인 필요 해제
  async update(userId: string, id: string, dto: UpdateTransactionDto) {
    const transaction = await this.prisma.transaction.findFirst({ where: { id, userId } });
    if (!transaction) throw new NotFoundException('거래 내역을 찾을 수 없습니다.');
    if (dto.categoryId) await this.assertCategory(dto.categoryId);
    return this.prisma.transaction.update({
      where: { id },
      data: {
        ...(dto.categoryId && { categoryId: dto.categoryId, confidence: null, needsReview: false }),
        ...(dto.description !== undefined && { description: dto.description.trim() || null }),
      },
      include: INCLUDE,
    });
  }

  private async assertCategory(id: string) {
    const category = await this.prisma.category.findFirst({ where: { id, isActive: true } });
    if (!category) throw new BadRequestException('존재하지 않는 카테고리입니다.');
  }

  // userId 조건으로 남의 거래는 ID를 알아도 삭제되지 않음
  async remove(userId: string, ids: string[]) {
    const { count } = await this.prisma.transaction.deleteMany({
      where: { id: { in: ids }, userId },
    });
    return count;
  }
}
