# 프로젝트 구조 상세 설명

## 현재 프로젝트 파일 구조

```
card-expense-tracker/
└── backend/
    ├── src/
    │   ├── main.ts                    # 애플리케이션 진입점
    │   ├── app.module.ts              # 루트 모듈
    │   ├── app.controller.ts          # 루트 컨트롤러
    │   ├── app.service.ts             # 루트 서비스
    │   │
    │   ├── database/                  # 데이터베이스 모듈
    │   │   ├── database.module.ts     # DatabaseModule 정의
    │   │   └── prisma.service.ts      # Prisma 클라이언트 서비스
    │   │
    │   └── users/                     # 사용자 관리 모듈
    │       ├── dto/                   # Data Transfer Objects
    │       │   ├── create-user.dto.ts # 사용자 생성 DTO
    │       │   └── update-user.dto.ts # 사용자 수정 DTO
    │       ├── entities/              # 엔티티 (응답 형식)
    │       │   └── user.entity.ts     # User 엔티티
    │       ├── users.controller.ts    # Users 컨트롤러
    │       ├── users.service.ts       # Users 서비스
    │       └── users.module.ts        # Users 모듈
    │
    ├── prisma/
    │   └── schema.prisma              # 데이터베이스 스키마
    │
    ├── test/                          # 테스트 파일
    │   ├── app.e2e-spec.ts
    │   └── jest-e2e.json
    │
    ├── .env                           # 환경변수 (gitignore)
    ├── .env.example                   # 환경변수 예시
    ├── .gitignore
    ├── package.json
    ├── tsconfig.json
    ├── nest-cli.json
    └── biome.json                     # 코드 포맷터/린터 설정
```

---

## 각 파일 상세 설명

### 1. src/main.ts
**역할**: 애플리케이션의 시작점

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
bootstrap();
```

**주요 설정 가능 항목**:
- CORS 설정
- 전역 파이프 (Validation)
- 전역 필터 (Exception Handling)
- 전역 인터셉터
- API 문서 (Swagger)

---

### 2. src/app.module.ts
**역할**: 루트 모듈, 모든 모듈을 통합

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),  // 환경변수
    DatabaseModule,                             // 데이터베이스
    UsersModule,                                // 사용자 관리
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

**imports**: 다른 모듈들을 가져옴
**controllers**: HTTP 요청 처리
**providers**: 서비스, 헬퍼 등

---

### 3. src/database/prisma.service.ts
**역할**: Prisma Client를 NestJS에서 사용할 수 있게 래핑

```typescript
@Injectable()
export class PrismaService extends PrismaClient 
  implements OnModuleInit, OnModuleDestroy {
  
  constructor(configService: ConfigService) {
    const pool = new Pool({
      connectionString: configService.get<string>('DATABASE_URL'),
    });
    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();  // 모듈 초기화 시 DB 연결
  }

  async onModuleDestroy() {
    await this.$disconnect();  // 모듈 종료 시 DB 연결 해제
  }
}
```

**특징**:
- 애플리케이션 시작 시 자동으로 DB 연결
- 종료 시 자동으로 연결 해제
- PostgreSQL 어댑터 사용

---

### 4. src/users/ 구조

#### users.module.ts
```typescript
@Module({
  imports: [DatabaseModule],        // PrismaService 사용
  controllers: [UsersController],   // HTTP 요청 처리
  providers: [UsersService],        // 비즈니스 로직
  exports: [UsersService],          // 다른 모듈에서 사용 가능
})
export class UsersModule {}
```

#### users.controller.ts
**역할**: HTTP 요청을 받아서 Service로 전달

```typescript
@Controller('users')  // 기본 경로: /users
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()  // POST /users
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()  // GET /users
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')  // GET /users/:id
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')  // PATCH /users/:id
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')  // DELETE /users/:id
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
```

#### users.service.ts
**역할**: 실제 비즈니스 로직 처리

```typescript
@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    // 1. 이메일 중복 체크
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // 2. 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // 3. 사용자 생성
    return this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
      },
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        // password는 제외
      },
    });
  }

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

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    // 1. 사용자 존재 확인
    await this.findOne(id);

    // 2. 이메일 변경 시 중복 체크
    if (updateUserDto.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });
      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('Email already exists');
      }
    }

    // 3. 비밀번호 변경 시 해싱
    const data: any = { ...updateUserDto };
    if (updateUserDto.password) {
      data.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    // 4. 업데이트
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

  async remove(id: string) {
    await this.findOne(id);
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
}
```

#### dto/create-user.dto.ts
**역할**: 사용자 생성 시 입력 데이터 검증

```typescript
export class CreateUserDto {
  @IsEmail()              // 이메일 형식 검증
  @IsNotEmpty()           // 빈 값 불가
  email: string;

  @IsString()             // 문자열 타입
  @IsNotEmpty()           // 필수 값
  @MinLength(6)           // 최소 6자
  password: string;

  @IsString()
  @IsOptional()           // 선택 값
  name?: string;
}
```

**검증 데코레이터**:
- `@IsEmail()`: 이메일 형식
- `@IsString()`: 문자열
- `@IsNumber()`: 숫자
- `@IsBoolean()`: 불린
- `@IsNotEmpty()`: 필수 값
- `@IsOptional()`: 선택 값
- `@MinLength(n)`: 최소 길이
- `@MaxLength(n)`: 최대 길이
- `@Min(n)`: 최소 값
- `@Max(n)`: 최대 값

#### dto/update-user.dto.ts
**역할**: 사용자 수정 시 입력 데이터 검증 (모든 필드 선택)

```typescript
export class UpdateUserDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  name?: string;
}
```

#### entities/user.entity.ts
**역할**: 응답 데이터 형식 정의 및 민감 정보 제외

```typescript
export class UserEntity {
  id: string;
  email: string;
  
  @Exclude()  // 응답에서 자동 제외
  password: string;
  
  name: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}
```

**사용 방법**:
```typescript
@Get(':id')
async findOne(@Param('id') id: string) {
  const user = await this.usersService.findOne(id);
  return new UserEntity(user);  // password 자동 제외
}
```

---

## 데이터 흐름

### 요청 → 응답 흐름

```
1. 클라이언트 요청
   ↓
2. Controller (@Get, @Post 등)
   - URL 파라미터 추출 (@Param)
   - 요청 본문 추출 (@Body)
   - 쿼리 파라미터 추출 (@Query)
   ↓
3. DTO Validation
   - class-validator로 자동 검증
   - 실패 시 400 Bad Request
   ↓
4. Service (비즈니스 로직)
   - 데이터베이스 접근
   - 비즈니스 규칙 적용
   - 에러 처리
   ↓
5. Entity (응답 변환)
   - 민감 정보 제외
   - 응답 형식 통일
   ↓
6. 클라이언트 응답
```

### 예시: 사용자 생성 요청

```
POST /users
Body: {
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}

↓ Controller
UsersController.create(createUserDto)

↓ DTO Validation
CreateUserDto 검증
- email: 이메일 형식 확인
- password: 최소 6자 확인
- name: 선택 값

↓ Service
UsersService.create(createUserDto)
1. 이메일 중복 체크
2. 비밀번호 해싱 (bcrypt)
3. DB에 저장 (Prisma)

↓ Response
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
// password는 응답에서 제외됨
```

---

## 의존성 주입 흐름

```
AppModule
├── imports: [DatabaseModule, UsersModule]
│
DatabaseModule
├── providers: [PrismaService]
├── exports: [PrismaService]  ← 다른 모듈에서 사용 가능
│
UsersModule
├── imports: [DatabaseModule]  ← PrismaService 가져옴
├── providers: [UsersService]
├── controllers: [UsersController]
│
UsersService
├── constructor(private prisma: PrismaService)  ← 자동 주입
│
UsersController
├── constructor(private usersService: UsersService)  ← 자동 주입
```

---

## 환경 설정 파일

### .env
```env
# 데이터베이스 연결 문자열
DATABASE_URL="postgresql://user:password@localhost:5432/card_expense_tracker?schema=public"

# JWT 설정
JWT_SECRET="your-secret-key-change-this-in-production"
JWT_EXPIRES_IN="7d"

# OpenAI API
OPENAI_API_KEY="your-openai-api-key"

# 파일 업로드
MAX_FILE_SIZE=10485760  # 10MB
UPLOAD_DIR="./uploads"

# 서버 설정
PORT=3000
NODE_ENV=development
```

### tsconfig.json
TypeScript 컴파일러 설정

### nest-cli.json
NestJS CLI 설정

### biome.json
코드 포맷터 및 린터 설정 (ESLint + Prettier 대체)

---

## 다음 구현할 기능들

### 1. 인증/인가 (Auth Module)
```
src/auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── strategies/
│   └── jwt.strategy.ts
├── guards/
│   └── jwt-auth.guard.ts
└── dto/
    ├── login.dto.ts
    └── register.dto.ts
```

### 2. 카테고리 관리 (Categories Module)
```
src/categories/
├── categories.module.ts
├── categories.controller.ts
├── categories.service.ts
├── dto/
│   ├── create-category.dto.ts
│   └── update-category.dto.ts
└── entities/
    └── category.entity.ts
```

### 3. 거래 내역 관리 (Transactions Module)
```
src/transactions/
├── transactions.module.ts
├── transactions.controller.ts
├── transactions.service.ts
├── dto/
│   ├── create-transaction.dto.ts
│   └── update-transaction.dto.ts
└── entities/
    └── transaction.entity.ts
```

### 4. 파일 업로드 (Files Module)
```
src/files/
├── files.module.ts
├── files.controller.ts
├── files.service.ts
└── dto/
    └── upload-file.dto.ts
```

---

## 참고 사항

### 코딩 컨벤션
- 파일명: kebab-case (user-service.ts)
- 클래스명: PascalCase (UserService)
- 변수/함수명: camelCase (findUser)
- 상수: UPPER_SNAKE_CASE (MAX_FILE_SIZE)

### Git 커밋 메시지
- feat: 새로운 기능
- fix: 버그 수정
- docs: 문서 수정
- style: 코드 포맷팅
- refactor: 코드 리팩토링
- test: 테스트 추가
- chore: 빌드 설정 등

### 에러 처리 원칙
1. Service에서 비즈니스 로직 에러 처리
2. 적절한 HTTP Exception 사용
3. 명확한 에러 메시지 제공
4. 민감한 정보 노출 금지
