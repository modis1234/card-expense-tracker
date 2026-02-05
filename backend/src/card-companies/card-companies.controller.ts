import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { CardCompaniesService } from './card-companies.service';
import { CreateCardCompanyDto } from './dto/create-card-company.dto';
import { UpdateCardCompanyDto } from './dto/update-card-company.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('card-companies')
@UseGuards(JwtAuthGuard)
export class CardCompaniesController {
  constructor(private readonly cardCompaniesService: CardCompaniesService) {}

  @Post()
  create(@Body() createCardCompanyDto: CreateCardCompanyDto) {
    return this.cardCompaniesService.create(createCardCompanyDto);
  }

  @Get()
  findAll() {
    return this.cardCompaniesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cardCompaniesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCardCompanyDto: UpdateCardCompanyDto) {
    return this.cardCompaniesService.update(id, updateCardCompanyDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.cardCompaniesService.remove(id);
  }
}
