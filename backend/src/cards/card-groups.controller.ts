import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
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

  @Post()
  create(@Req() req: any, @Body() dto: CreateCardGroupDto) {
    return this.cardsService.createGroup(req.user.userId, dto);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.cardsService.findAllGroups(req.user.userId);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateCardGroupDto) {
    return this.cardsService.updateGroup(req.user.userId, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.cardsService.removeGroup(req.user.userId, id);
  }
}
