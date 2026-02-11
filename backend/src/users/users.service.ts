import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

/**
 * 사용자 관리 서비스
 * 
 * 사용자 CRUD 작업의 비즈니스 로직을 처리합니다.
 * - 데이터베이스 접근 (Prisma)
 * - 비밀번호 해싱 (bcrypt)
 * - 유효성 검증 및 에러 처리
 * 
 * @Injectable() - NestJS 의존성 주입 시스템에 등록
 */
@Injectable()
export class UsersService {
  /**
   * PrismaService를 의존성 주입으로 받아옴
   * Prisma Client를 통해 데이터베이스에 접근
   */
  constructor(private prisma: PrismaService) {}

  /**
   * 새로운 사용자 생성
   * 
   * @param createUserDto - 사용자 생성 데이터
   * @returns 생성된 사용자 정보 (password 포함)
   * 
   * @throws {ConflictException} 이메일이 이미 존재하는 경우
   * 
   * 처리 과정:
   * 1. 이메일 중복 확인
   * 2. 비밀번호 해싱 (bcrypt, salt rounds: 10)
   * 3. 데이터베이스에 저장
   */
  async create(createUserDto: CreateUserDto) {
    // 1. 이메일 중복 체크
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // 2. 비밀번호 해싱
    // bcrypt.hash(평문 비밀번호, salt rounds)
    // salt rounds 10: 2^10 = 1024번 해싱 (보안과 성능의 균형)
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // 3. 사용자 생성
    return this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword, // 해싱된 비밀번호로 대체
      },
    });
  }

  /**
   * 모든 사용자 조회
   * 
   * @returns 모든 사용자 목록 (password 제외)
   * 
   * select를 사용하여 password 필드를 응답에서 제외
   * 보안상 민감한 정보는 서비스 레이어에서부터 제외하는 것이 좋음
   */
  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        // password는 의도적으로 제외
      },
    });
  }

  /**
   * 특정 사용자 조회
   * 
   * @param id - 사용자 UUID
   * @returns 사용자 정보 (password 제외)
   * 
   * @throws {NotFoundException} 사용자를 찾을 수 없는 경우
   * 
   * findUnique: 고유 필드(id, email)로 단일 레코드 조회
   * - 인덱스를 사용하므로 빠름
   * - 결과가 없으면 null 반환
   */
  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // 사용자가 없으면 404 에러 발생
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  /**
   * 사용자 정보 수정
   * 
   * @param id - 사용자 UUID
   * @param updateUserDto - 수정할 데이터 (부분 업데이트 가능)
   * @returns 수정된 사용자 정보 (password 제외)
   * 
   * @throws {NotFoundException} 사용자를 찾을 수 없는 경우
   * @throws {ConflictException} 변경하려는 이메일이 이미 존재하는 경우
   * 
   * 처리 과정:
   * 1. 사용자 존재 확인
   * 2. 이메일 변경 시 중복 확인
   * 3. 비밀번호 변경 시 해싱
   * 4. 데이터베이스 업데이트
   */
  async update(id: string, updateUserDto: UpdateUserDto) {
    // 1. 사용자 존재 확인 (없으면 NotFoundException 발생)
    await this.findOne(id);

    // 2. 이메일 변경 시 중복 체크
    if (updateUserDto.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });

      // 다른 사용자가 이미 해당 이메일을 사용 중인지 확인
      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('Email already exists');
      }
    }

    // 3. 업데이트할 데이터 준비
    const data: any = { ...updateUserDto };
    
    // 비밀번호 변경 시 해싱
    if (updateUserDto.password) {
      data.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    // 4. 데이터베이스 업데이트
    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * 사용자 삭제
   * 
   * @param id - 사용자 UUID
   * @returns 삭제된 사용자 정보 (password 제외)
   * 
   * @throws {NotFoundException} 사용자를 찾을 수 없는 경우
   * 
   * 처리 과정:
   * 1. 사용자 존재 확인
   * 2. 데이터베이스에서 삭제
   * 
   * 주의사항:
   * - Prisma 스키마의 onDelete 설정에 따라 관련 데이터 처리
   * - Cascade: 관련 데이터도 함께 삭제
   * - Restrict: 관련 데이터가 있으면 삭제 불가
   * - SetNull: 관련 데이터의 외래키를 null로 설정
   */
  async remove(id: string) {
    // 1. 사용자 존재 확인 (없으면 NotFoundException 발생)
    await this.findOne(id);

    // 2. 사용자 삭제
    return this.prisma.user.delete({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Google ID로 사용자 조회
   */
  async findByGoogleId(googleId: string) {
    return this.prisma.user.findFirst({
      where: { googleId: googleId } as any,
    });
  }

  /**
   * 이메일로 사용자 조회
   */
  async findByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: { email },
    });
  }

  /**
   * Google ID 업데이트
   */
  async updateGoogleId(id: string, googleId: string, picture?: string) {
    const updateData: any = {
      googleId,
      provider: 'google',
    };
    if (picture) {
      updateData.picture = picture;
    }
    
    return this.prisma.user.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Google 사용자 생성
   */
  async createGoogleUser(data: {
    googleId: string;
    email: string;
    name: string;
    picture?: string;
  }) {
    const createData: any = {
      googleId: data.googleId,
      email: data.email,
      name: data.name,
      provider: 'google',
    };
    
    if (data.picture) {
      createData.picture = data.picture;
    }
    
    return this.prisma.user.create({
      data: createData,
    });
  }

  async updateGmailTokens(userId: string, accessToken: string, refreshToken?: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        gmailAccessToken: accessToken,
        gmailRefreshToken: refreshToken,
      },
    });
  }
}
