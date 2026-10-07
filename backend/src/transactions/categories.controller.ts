import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../database/prisma.service';

@ApiTags('transactions')
@ApiBearerAuth()
@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({
    summary: '카테고리 목록',
    description: '활성 카테고리를 정렬 순서대로 반환합니다. 거래 카테고리 수동 변경에 사용합니다.',
  })
  findAll() {
    return this.prisma.category.findMany({ where: { isActive: true }, orderBy: { order: 'asc' } });
  }
}
