import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CardsService } from './cards.service';
import { CreateCardGroupDto } from './dto/create-card-group.dto';
import { UpdateCardGroupDto } from './dto/update-card-group.dto';
import { AddGroupMemberDto } from './dto/add-group-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('card-groups')
@ApiBearerAuth()
@Controller('card-groups')
@UseGuards(JwtAuthGuard)
export class CardGroupsController {
  constructor(private readonly cardsService: CardsService) {}

  @ApiOperation({ summary: '카드 그룹 생성', description: '개인, 여행 모임 등 카드를 묶을 목적별 그룹을 만듭니다. 그룹명은 사용자별로 중복될 수 없습니다.' })
  @Post()
  create(@Req() req: any, @Body() dto: CreateCardGroupDto) {
    return this.cardsService.createGroup(req.user.userId, dto);
  }

  @ApiOperation({ summary: '내 카드 그룹 목록', description: '그룹별 소속 카드와 공유 멤버를 함께 조회합니다.' })
  @Get()
  findAll(@Req() req: any) {
    return this.cardsService.findAllGroups(req.user.userId);
  }

  // 'shared'가 ':id'로 잡히지 않게 :id 라우트보다 먼저 선언
  @ApiOperation({ summary: '공유받은 카드 그룹 목록', description: '다른 사용자가 나에게 공유한 그룹을 소유자 정보·소속 카드와 함께 조회합니다.' })
  @Get('shared')
  findShared(@Req() req: any) {
    return this.cardsService.findSharedGroups(req.user.userId);
  }

  @ApiOperation({ summary: '카드 그룹 공유', description: '이메일로 가입된 사용자에게 그룹을 읽기 전용으로 공유합니다. 상대는 GET /transactions?groupId= 로 그룹 거래를 조회할 수 있습니다.' })
  @Post(':id/members')
  addMember(@Req() req: any, @Param('id') id: string, @Body() dto: AddGroupMemberDto) {
    return this.cardsService.addMember(req.user.userId, id, dto.email);
  }

  @ApiOperation({ summary: '카드 그룹 공유 해제', description: '소유자는 멤버를 내보낼 수 있고, 멤버는 본인 ID로 호출해 공유를 해제할 수 있습니다.' })
  @Delete(':id/members/:userId')
  @HttpCode(204)
  removeMember(@Req() req: any, @Param('id') id: string, @Param('userId') memberId: string) {
    return this.cardsService.removeMember(req.user.userId, id, memberId);
  }

  @ApiOperation({ summary: '카드 그룹 수정', description: '그룹명이나 색상을 변경합니다.' })
  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateCardGroupDto) {
    return this.cardsService.updateGroup(req.user.userId, id, dto);
  }

  @ApiOperation({ summary: '카드 그룹 삭제', description: '소속 카드는 삭제되지 않고 그룹 미지정 상태가 됩니다.' })
  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.cardsService.removeGroup(req.user.userId, id);
  }
}
