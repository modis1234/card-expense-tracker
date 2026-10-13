import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateCardGroupDto } from './dto/create-card-group.dto';
import { UpdateCardGroupDto } from './dto/update-card-group.dto';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';

const USER_SUMMARY = { id: true, email: true, name: true } as const;

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
      include: { cards: true, members: { include: { user: { select: USER_SUMMARY } } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  // 공유받은 그룹: 소유자 정보와 소속 카드만 (멤버 목록은 소유자만 봄)
  findSharedGroups(userId: string) {
    return this.prisma.cardGroup.findMany({
      where: { members: { some: { userId } } },
      include: { cards: true, user: { select: USER_SUMMARY } },
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

  // ===== 그룹 공유 (읽기 전용) =====

  async addMember(userId: string, groupId: string, email: string) {
    await this.findGroupOrThrow(userId, groupId);
    const member = await this.prisma.user.findUnique({ where: { email } });
    if (!member) throw new NotFoundException('가입된 사용자가 아닙니다. 상대가 먼저 Google 로그인을 해야 합니다.');
    if (member.id === userId) throw new BadRequestException('본인에게는 공유할 수 없습니다.');
    // 이미 공유된 사용자면 그대로 둠
    await this.prisma.cardGroupMember.upsert({
      where: { groupId_userId: { groupId, userId: member.id } },
      create: { groupId, userId: member.id },
      update: {},
    });
    return { id: member.id, email: member.email, name: member.name };
  }

  // 소유자는 멤버를 내보내고, 멤버는 스스로 공유를 해제할 수 있다
  async removeMember(userId: string, groupId: string, memberId: string) {
    if (memberId !== userId) await this.findGroupOrThrow(userId, groupId);
    const { count } = await this.prisma.cardGroupMember.deleteMany({ where: { groupId, userId: memberId } });
    if (!count) throw new NotFoundException('공유 멤버를 찾을 수 없습니다.');
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
