import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CardsService } from './cards.service';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('cards')
@ApiBearerAuth()
@Controller('cards')
@UseGuards(JwtAuthGuard)
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  @ApiOperation({ summary: '카드 등록', description: '카드번호 끝 4자리로 카드를 등록합니다. 엑셀 업로드 시 처음 보는 카드는 자동 등록되므로 직접 등록하지 않아도 됩니다.' })
  @Post()
  create(@Req() req: any, @Body() dto: CreateCardDto) {
    return this.cardsService.createCard(req.user.userId, dto);
  }

  @ApiOperation({ summary: '내 카드 목록', description: '카드사, 소속 그룹과 함께 조회합니다. groupId가 null이면 그룹 미지정 카드입니다.' })
  @Get()
  findAll(@Req() req: any) {
    return this.cardsService.findAllCards(req.user.userId);
  }

  @ApiOperation({ summary: '카드 수정 (별칭·그룹 지정)', description: 'groupId에 그룹 ID를 넣으면 해당 그룹으로, null을 넣으면 미지정으로 변경합니다.' })
  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateCardDto) {
    return this.cardsService.updateCard(req.user.userId, id, dto);
  }

  @ApiOperation({ summary: '카드 삭제', description: '카드의 거래 내역은 남고 카드 연결만 해제됩니다.' })
  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.cardsService.removeCard(req.user.userId, id);
  }
}
