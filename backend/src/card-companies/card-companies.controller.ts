import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CardCompaniesService } from './card-companies.service';
import { CreateCardCompanyDto } from './dto/create-card-company.dto';
import { UpdateCardCompanyDto } from './dto/update-card-company.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('card-companies')
@ApiBearerAuth()
@Controller('card-companies')
@UseGuards(JwtAuthGuard)
export class CardCompaniesController {
  constructor(private readonly cardCompaniesService: CardCompaniesService) {}

  @ApiOperation({ summary: '카드사 등록', description: 'code는 엑셀 파일명 식별에 쓰이는 코드입니다. (예: HYUNDAI, SHINHAN)' })
  @Post()
  create(@Body() createCardCompanyDto: CreateCardCompanyDto) {
    return this.cardCompaniesService.create(createCardCompanyDto);
  }

  @ApiOperation({ summary: '카드사 목록 조회', description: '활성화된 카드사를 이름순으로 조회합니다.' })
  @Get()
  findAll() {
    return this.cardCompaniesService.findAll();
  }

  @ApiOperation({ summary: '카드사 조회', description: 'ID로 카드사를 조회합니다.' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cardCompaniesService.findOne(id);
  }

  @ApiOperation({ summary: '카드사 수정', description: '카드사 정보를 수정합니다.' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCardCompanyDto: UpdateCardCompanyDto) {
    return this.cardCompaniesService.update(id, updateCardCompanyDto);
  }

  @ApiOperation({ summary: '카드사 비활성화', description: '실제로 삭제하지 않고 isActive=false로 변경합니다.' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.cardCompaniesService.remove(id);
  }
}
