import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CardsService } from './cards.service';
import { CreateCardGroupDto } from './dto/create-card-group.dto';
import { UpdateCardGroupDto } from './dto/update-card-group.dto';
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

  @ApiOperation({ summary: '내 카드 그룹 목록', description: '그룹별 소속 카드와 함께 조회합니다.' })
  @Get()
  findAll(@Req() req: any) {
    return this.cardsService.findAllGroups(req.user.userId);
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
