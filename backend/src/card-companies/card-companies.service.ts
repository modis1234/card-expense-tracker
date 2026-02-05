import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateCardCompanyDto } from './dto/create-card-company.dto';
import { UpdateCardCompanyDto } from './dto/update-card-company.dto';

@Injectable()
export class CardCompaniesService {
  constructor(private prisma: PrismaService) {}

  create(createCardCompanyDto: CreateCardCompanyDto) {
    return this.prisma.cardCompany.create({
      data: createCardCompanyDto,
    });
  }

  findAll() {
    return this.prisma.cardCompany.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.cardCompany.findUnique({
      where: { id },
    });
  }

  findByCode(code: string) {
    return this.prisma.cardCompany.findUnique({
      where: { code },
    });
  }

  update(id: string, updateCardCompanyDto: UpdateCardCompanyDto) {
    return this.prisma.cardCompany.update({
      where: { id },
      data: updateCardCompanyDto,
    });
  }

  remove(id: string) {
    return this.prisma.cardCompany.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
