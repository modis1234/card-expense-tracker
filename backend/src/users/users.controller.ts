import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  ClassSerializerInterceptor,
  HttpStatus,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserEntity } from './entities/user.entity';

/**
 * 사용자 관리 컨트롤러
 * 
 * 사용자 CRUD 작업을 위한 REST API 엔드포인트를 제공합니다.
 * 기본 경로: /users
 * 
 * @UseInterceptors(ClassSerializerInterceptor)
 * - UserEntity의 @Exclude() 데코레이터를 적용하여 password 필드를 응답에서 자동 제외
 */
@ApiTags('users')
@Controller('users')
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  /**
   * UsersService를 의존성 주입으로 받아옴
   * readonly: 컨트롤러 내에서 서비스 인스턴스 변경 불가
   */
  constructor(private readonly usersService: UsersService) {}

  /**
   * 새로운 사용자 생성
   * 
   * @route POST /users
   * @param createUserDto - 사용자 생성 데이터 (email, password, name)
   * @returns 생성된 사용자 정보 (password 제외)
   * 
   * @throws {ConflictException} 이메일이 이미 존재하는 경우
   * @throws {BadRequestException} 유효성 검증 실패 시
   * 
   * @example
   * POST /users
   * Body: { "email": "user@example.com", "password": "password123", "name": "John" }
   * Response: { "id": "uuid", "email": "user@example.com", "name": "John", ... }
   */
  @Post()
  @ApiOperation({ summary: '사용자 생성', description: '새로운 사용자를 생성합니다.' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: '사용자가 성공적으로 생성되었습니다.',
    type: UserEntity,
  })
  @ApiResponse({ 
    status: HttpStatus.CONFLICT, 
    description: '이메일이 이미 존재합니다.',
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: '유효성 검증 실패',
  })
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);
    return new UserEntity(user);
  }

  /**
   * 모든 사용자 조회
   * 
   * @route GET /users
   * @returns 모든 사용자 목록 (password 제외)
   * 
   * @example
   * GET /users
   * Response: [{ "id": "uuid", "email": "user@example.com", ... }, ...]
   */
  @Get()
  @ApiOperation({ summary: '모든 사용자 조회', description: '등록된 모든 사용자 목록을 조회합니다.' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: '사용자 목록 조회 성공',
    type: [UserEntity],
  })
  async findAll() {
    const users = await this.usersService.findAll();
    return users.map(user => new UserEntity(user));
  }

  /**
   * 특정 사용자 조회
   * 
   * @route GET /users/:id
   * @param id - 사용자 UUID
   * @returns 사용자 정보 (password 제외)
   * 
   * @throws {NotFoundException} 사용자를 찾을 수 없는 경우
   * 
   * @example
   * GET /users/550e8400-e29b-41d4-a716-446655440000
   * Response: { "id": "uuid", "email": "user@example.com", ... }
   */
  @Get(':id')
  @ApiOperation({ summary: '사용자 조회', description: 'ID로 특정 사용자를 조회합니다.' })
  @ApiParam({ name: 'id', description: '사용자 UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: '사용자 조회 성공',
    type: UserEntity,
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: '사용자를 찾을 수 없습니다.',
  })
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findOne(id);
    return new UserEntity(user);
  }

  /**
   * 사용자 정보 수정
   * 
   * @route PATCH /users/:id
   * @param id - 사용자 UUID
   * @param updateUserDto - 수정할 데이터 (email, password, name 중 선택)
   * @returns 수정된 사용자 정보 (password 제외)
   * 
   * @throws {NotFoundException} 사용자를 찾을 수 없는 경우
   * @throws {ConflictException} 변경하려는 이메일이 이미 존재하는 경우
   * @throws {BadRequestException} 유효성 검증 실패 시
   * 
   * @example
   * PATCH /users/550e8400-e29b-41d4-a716-446655440000
   * Body: { "name": "Updated Name" }
   * Response: { "id": "uuid", "email": "user@example.com", "name": "Updated Name", ... }
   */
  @Patch(':id')
  @ApiOperation({ summary: '사용자 수정', description: '사용자 정보를 수정합니다.' })
  @ApiParam({ name: 'id', description: '사용자 UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: '사용자 수정 성공',
    type: UserEntity,
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: '사용자를 찾을 수 없습니다.',
  })
  @ApiResponse({ 
    status: HttpStatus.CONFLICT, 
    description: '이메일이 이미 존재합니다.',
  })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    const user = await this.usersService.update(id, updateUserDto);
    return new UserEntity(user);
  }

  /**
   * 사용자 삭제
   * 
   * @route DELETE /users/:id
   * @param id - 사용자 UUID
   * @returns 삭제된 사용자 정보 (password 제외)
   * 
   * @throws {NotFoundException} 사용자를 찾을 수 없는 경우
   * 
   * @example
   * DELETE /users/550e8400-e29b-41d4-a716-446655440000
   * Response: { "id": "uuid", "email": "user@example.com", ... }
   * 
   * @note Prisma 스키마의 onDelete: Cascade 설정에 따라 관련 데이터도 함께 삭제됨
   */
  @Delete(':id')
  @ApiOperation({ summary: '사용자 삭제', description: '사용자를 삭제합니다.' })
  @ApiParam({ name: 'id', description: '사용자 UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: '사용자 삭제 성공',
    type: UserEntity,
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: '사용자를 찾을 수 없습니다.',
  })
  async remove(@Param('id') id: string) {
    const user = await this.usersService.remove(id);
    return new UserEntity(user);
  }
}
