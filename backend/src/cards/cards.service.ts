import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateCardGroupDto } from './dto/create-card-group.dto';
import { UpdateCardGroupDto } from './dto/update-card-group.dto';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';

@Injectable()
export class CardsService {
  constructor(private prisma: PrismaService) {}

  // ===== 카드 그룹 =====

  createGroup(userId: string, dto: CreateCardGroupDto) {
    return this.prisma.cardGroup.create({ data: { ...dto, userId } });
  }

  findAllGroups(userId: string) {
    return this.prisma.cardGroup.findMany({
      where: { userId },
      include: { cards: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateGroup(userId: string, id: string, dto: UpdateCardGroupDto) {
    await this.findGroupOrThrow(userId, id);
    return this.prisma.cardGroup.update({ where: { id }, data: dto });
  }

  // 그룹 삭제 시 소속 카드는 미지정(groupId = null)으로 돌아간다
  async removeGroup(userId: string, id: string) {
    await this.findGroupOrThrow(userId, id);
    return this.prisma.cardGroup.delete({ where: { id } });
  }

  // ===== 카드 =====

  async createCard(userId: string, dto: CreateCardDto) {
    if (dto.groupId) await this.findGroupOrThrow(userId, dto.groupId);
    return this.prisma.card.create({ data: { ...dto, userId } });
  }

  findAllCards(userId: string) {
    return this.prisma.card.findMany({
      where: { userId },
      include: { cardCompany: true, group: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateCard(userId: string, id: string, dto: UpdateCardDto) {
    await this.findCardOrThrow(userId, id);
    if (dto.groupId) await this.findGroupOrThrow(userId, dto.groupId);
    return this.prisma.card.update({ where: { id }, data: dto });
  }

  // 카드 삭제 시 거래 내역은 남고 cardId만 null이 된다
  async removeCard(userId: string, id: string) {
    await this.findCardOrThrow(userId, id);
    return this.prisma.card.delete({ where: { id } });
  }

  private async findGroupOrThrow(userId: string, id: string) {
    const group = await this.prisma.cardGroup.findFirst({ where: { id, userId } });
    if (!group) throw new NotFoundException('카드 그룹을 찾을 수 없습니다.');
    return group;
  }

  private async findCardOrThrow(userId: string, id: string) {
    const card = await this.prisma.card.findFirst({ where: { id, userId } });
    if (!card) throw new NotFoundException('카드를 찾을 수 없습니다.');
    return card;
  }
}
