# NestJS 프로젝트 가이드

## 목차
1. [NestJS란?](#nestjs란)
2. [프로젝트 구조](#프로젝트-구조)
3. [핵심 개념](#핵심-개념)
4. [현재 프로젝트 구조](#현재-프로젝트-구조)
5. [개발 워크플로우](#개발-워크플로우)
6. [자주 사용하는 명령어](#자주-사용하는-명령어)

---

## NestJS란?

NestJS는 Node.js 기반의 서버사이드 프레임워크로, TypeScript를 기본으로 사용합니다.
- **Angular에서 영감**을 받아 모듈, 의존성 주입(DI) 등의 개념을 사용
- **Express** 또는 **Fastify** 위에서 동작
- **타입 안정성**과 **확장 가능한 아키텍처** 제공

---

## 프로젝트 구조

```
backend/
├── src/                      # 소스 코드 (TypeScript)
│   │                         # 모든 애플리케이션 로직이 여기에 위치
│   │
│   ├── main.ts              # 애플리케이션 진입점
│   │                         # - NestJS 앱을 생성하고 서버를 시작
│   │                         # - 전역 설정 (CORS, Validation Pipe 등)
│   │                         # - 포트 설정 및 리스닝
│   │
│   ├── app.module.ts        # 루트 모듈 (최상위 모듈)
│   │                         # - 모든 기능 모듈을 통합
│   │                         # - 전역 모듈 설정 (ConfigModule 등)
│   │                         # - 애플리케이션의 시작점
│   │
│   ├── app.controller.ts    # 루트 컨트롤러
│   │                         # - 기본 경로(/) 처리
│   │                         # - 헬스체크 등 기본 엔드포인트
│   │
│   ├── app.service.ts       # 루트 서비스
│   │                         # - 루트 컨트롤러의 비즈니스 로직
│   │                         # - 공통 유틸리티 기능
│   │
│   ├── database/            # 데이터베이스 모듈
│   │   │                     # - Prisma ORM 설정 및 관리
│   │   │                     # - 다른 모듈에서 DB 접근 시 사용
│   │   │
│   │   ├── database.module.ts    # DatabaseModule 정의
│   │   │                          # - PrismaService를 제공하고 export
│   │   │                          # - 다른 모듈에서 import하여 사용
│   │   │
│   │   └── prisma.service.ts     # Prisma Client 래퍼
│   │                              # - DB 연결/해제 관리
│   │                              # - Prisma Client 인스턴스 제공
│   │                              # - 트랜잭션, 쿼리 실행
│   │
│   └── users/               # Users 기능 모듈 (사용자 관리)
│       │                     # - 사용자 CRUD 기능
│       │                     # - 독립적인 기능 단위
│       │
│       ├── dto/             # Data Transfer Objects
│       │   │                 # - 클라이언트 ↔ 서버 간 데이터 전송 형식
│       │   │                 # - 유효성 검증 규칙 정의
│       │   │
│       │   ├── create-user.dto.ts    # 사용자 생성 시 입력 데이터
│       │   │                          # - 필수 필드: email, password
│       │   │                          # - 선택 필드: name
│       │   │                          # - 유효성 검증 데코레이터 포함
│       │   │
│       │   └── update-user.dto.ts    # 사용자 수정 시 입력 데이터
│       │                              # - 모든 필드 선택 사항
│       │                              # - 부분 업데이트 지원
│       │
│       ├── entities/        # 엔티티 (응답 형식 정의)
│       │   │                 # - API 응답 데이터 구조
│       │   │                 # - 민감한 정보 제외 처리
│       │   │
│       │   └── user.entity.ts        # User 응답 엔티티
│       │                              # - password 필드 자동 제외
│       │                              # - 클라이언트에 전송할 데이터만 포함
│       │
│       ├── users.controller.ts  # HTTP 요청 처리 (라우팅)
│       │                         # - REST API 엔드포인트 정의
│       │                         # - URL 파라미터, Body 추출
│       │                         # - Service 호출 및 응답 반환
│       │                         # - 경로: /users
│       │
│       ├── users.service.ts     # 비즈니스 로직
│       │                         # - 실제 데이터 처리 로직
│       │                         # - DB 접근 (Prisma 사용)
│       │                         # - 유효성 검증, 에러 처리
│       │                         # - 비밀번호 해싱 등
│       │
│       └── users.module.ts      # Users 모듈 정의
│                                 # - Controller, Service 등록
│                                 # - 의존성 주입 설정
│                                 # - 다른 모듈 import/export
│
├── prisma/                  # Prisma ORM 설정
│   │                         # - 데이터베이스 스키마 정의
│   │                         # - 마이그레이션 파일 저장
│   │
│   └── schema.prisma        # 데이터베이스 스키마
│                             # - 테이블 구조 정의 (User, Transaction 등)
│                             # - 관계 설정 (1:N, N:M 등)
│                             # - 인덱스, 제약조건 정의
│                             # - Prisma Client 생성 기준
│
├── test/                    # 테스트 파일
│   │                         # - E2E 테스트, 단위 테스트
│   │                         # - Jest 테스트 프레임워크 사용
│   │
│   ├── app.e2e-spec.ts      # E2E 테스트 (통합 테스트)
│   └── jest-e2e.json        # E2E 테스트 설정
│
├── dist/                    # 빌드 결과물 (JavaScript)
│   │                         # - TypeScript 컴파일 결과
│   │                         # - 프로덕션 배포 시 사용
│   │                         # - npm run build로 생성
│   │
│   └── (컴파일된 .js 파일들)
│
├── node_modules/            # 의존성 패키지
│   │                         # - npm install로 설치된 라이브러리
│   │                         # - @nestjs, prisma, bcrypt 등
│   │                         # - .gitignore에 포함 (버전 관리 제외)
│   │
│   └── (수천 개의 패키지들)
│
├── .env                     # 환경변수 파일 (gitignore)
│                             # - DATABASE_URL, JWT_SECRET 등
│                             # - 민감한 정보 포함
│
├── .env.example             # 환경변수 예시 파일
│                             # - 필요한 환경변수 목록
│                             # - 실제 값은 포함하지 않음
│
├── package.json             # 프로젝트 메타데이터
│                             # - 의존성 목록
│                             # - 스크립트 명령어
│                             # - 프로젝트 정보
│
├── tsconfig.json            # TypeScript 컴파일러 설정
│                             # - 타입 체크 규칙
│                             # - 컴파일 옵션
│
├── nest-cli.json            # NestJS CLI 설정
│                             # - 빌드 설정
│                             # - 파일 생성 규칙
│
└── biome.json               # Biome 설정 (린터/포맷터)
                              # - 코드 스타일 규칙
                              # - ESLint + Prettier 대체
```

### 디렉토리별 역할 요약

| 디렉토리/파일 | 역할 | 수정 빈도 |
|--------------|------|----------|
| `src/` | 애플리케이션 소스 코드 | 매우 높음 |
| `src/main.ts` | 앱 시작점, 전역 설정 | 낮음 |
| `src/app.module.ts` | 모듈 통합 | 중간 (새 모듈 추가 시) |
| `src/*/dto/` | API 입력 데이터 정의 | 높음 |
| `src/*/entities/` | API 응답 데이터 정의 | 중간 |
| `src/*/*.controller.ts` | API 엔드포인트 정의 | 높음 |
| `src/*/*.service.ts` | 비즈니스 로직 | 매우 높음 |
| `src/*/*.module.ts` | 모듈 설정 | 낮음 |
| `prisma/schema.prisma` | DB 스키마 | 중간 |
| `test/` | 테스트 코드 | 중간 |
| `dist/` | 빌드 결과 (자동 생성) | 수정 안 함 |
| `node_modules/` | 패키지 (자동 생성) | 수정 안 함 |
| `.env` | 환경변수 (로컬) | 낮음 |
| `package.json` | 의존성 관리 | 중간 |

### 파일 명명 규칙

```
기능명.타입.ts

예시:
- users.controller.ts    # 컨트롤러
- users.service.ts       # 서비스
- users.module.ts        # 모듈
- create-user.dto.ts     # DTO
- user.entity.ts         # 엔티티
- users.service.spec.ts  # 테스트 파일
```

---

## 핵심 개념

### 1. Module (모듈)
**역할**: 관련된 기능들을 하나로 묶는 단위

```typescript
@Module({
  imports: [DatabaseModule],      // 다른 모듈 가져오기
  controllers: [UsersController],  // 컨트롤러 등록
  providers: [UsersService],       // 서비스 등록 (의존성 주입)
  exports: [UsersService],         // 다른 모듈에서 사용 가능하게 내보내기
})
export class UsersModule {}
```

**특징**:
- 애플리케이션을 기능별로 분리
- 재사용 가능하고 테스트하기 쉬움
- `AppModule`이 루트 모듈

---

### 2. Controller (컨트롤러)
**역할**: HTTP 요청을 받아서 처리하고 응답을 반환

```typescript
@Controller('users')  // /users 경로
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

**주요 데코레이터**:
- `@Controller('path')`: 기본 경로 설정
- `@Get()`, `@Post()`, `@Patch()`, `@Delete()`: HTTP 메서드
- `@Param('id')`: URL 파라미터 추출
- `@Body()`: 요청 본문 추출
- `@Query()`: 쿼리 파라미터 추출

---

### 3. Service (서비스)
**역할**: 비즈니스 로직을 처리 (데이터베이스 접근, 계산 등)

```typescript
@Injectable()  // 의존성 주입 가능하게 만듦
export class UsersService {
  constructor(private prisma: PrismaService) {}  // 자동 주입

  async create(createUserDto: CreateUserDto) {
    // 비즈니스 로직
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    return this.prisma.user.create({
      data: { ...createUserDto, password: hashedPassword },
    });
  }

  async findAll() {
    return this.prisma.user.findMany();
  }
}
```

**특징**:
- `@Injectable()` 데코레이터 필수
- 컨트롤러에서 주입받아 사용
- 재사용 가능하고 테스트하기 쉬움

---

### 4. DTO (Data Transfer Object)
**역할**: 클라이언트와 서버 간 데이터 전송 형식 정의 및 유효성 검증

```typescript
export class CreateUserDto {
  @IsEmail()              // 이메일 형식 검증
  @IsNotEmpty()           // 필수 값
  email: string;

  @IsString()
  @MinLength(6)           // 최소 6자
  password: string;

  @IsString()
  @IsOptional()           // 선택 값
  name?: string;
}
```

**특징**:
- `class-validator`로 자동 유효성 검증
- 타입 안정성 제공
- API 문서 자동 생성에 활용

---

### 5. Entity (엔티티)
**역할**: 응답 데이터 형식 정의 및 민감한 정보 제외

```typescript
export class UserEntity {
  id: string;
  email: string;
  
  @Exclude()  // 응답에서 제외
  password: string;
  
  name: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}
```

**사용 예시**:
```typescript
@Get(':id')
async findOne(@Param('id') id: string) {
  const user = await this.usersService.findOne(id);
  return new UserEntity(user);  // password 자동 제외
}
```

---

### 6. 의존성 주입 (Dependency Injection)
**개념**: 필요한 객체를 직접 생성하지 않고 NestJS가 자동으로 주입

```typescript
// ❌ 직접 생성 (안 좋음)
export class UsersController {
  private usersService = new UsersService();
}

// ✅ 의존성 주입 (좋음)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  // NestJS가 자동으로 UsersService 인스턴스를 주입
}
```

**장점**:
- 테스트하기 쉬움 (Mock 객체 주입 가능)
- 코드 재사용성 증가
- 결합도 감소

---

## 현재 프로젝트 구조

### 1. 데이터베이스 (Prisma)
```typescript
// prisma/schema.prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### 2. 모듈 구조
```
AppModule (루트)
├── ConfigModule (환경변수)
├── DatabaseModule (Prisma)
└── UsersModule (사용자 관리)
    ├── UsersController
    └── UsersService
```

### 3. API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | /users | 사용자 생성 |
| GET | /users | 모든 사용자 조회 |
| GET | /users/:id | 특정 사용자 조회 |
| PATCH | /users/:id | 사용자 정보 수정 |
| DELETE | /users/:id | 사용자 삭제 |

---

## 개발 워크플로우

### 새로운 기능 추가하기 (예: Posts 기능)

#### 1. 모듈 생성
```bash
nest g module posts
nest g controller posts
nest g service posts
```

#### 2. Prisma 스키마 수정
```prisma
model Post {
  id        String   @id @default(uuid())
  title     String
  content   String
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())
}
```

#### 3. Prisma 마이그레이션
```bash
npx prisma migrate dev --name add-posts
npx prisma generate
```

#### 4. DTO 생성
```typescript
// posts/dto/create-post.dto.ts
export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsNotEmpty()
  userId: string;
}
```

#### 5. Service 구현
```typescript
@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  async create(createPostDto: CreatePostDto) {
    return this.prisma.post.create({
      data: createPostDto,
    });
  }

  async findAll() {
    return this.prisma.post.findMany({
      include: { user: true },  // 관계 데이터 포함
    });
  }
}
```

#### 6. Controller 구현
```typescript
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  create(@Body() createPostDto: CreatePostDto) {
    return this.postsService.create(createPostDto);
  }

  @Get()
  findAll() {
    return this.postsService.findAll();
  }
}
```

#### 7. Module 설정
```typescript
@Module({
  imports: [DatabaseModule],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
```

#### 8. AppModule에 등록
```typescript
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    UsersModule,
    PostsModule,  // 추가
  ],
})
export class AppModule {}
```

---

## 자주 사용하는 명령어

### 개발
```bash
# 개발 서버 실행 (자동 재시작)
npm run start:dev

# 일반 실행
npm run start

# 프로덕션 빌드
npm run build
npm run start:prod
```

### Prisma
```bash
# Prisma Client 생성
npx prisma generate

# 데이터베이스 마이그레이션
npx prisma migrate dev

# Prisma Studio (DB GUI)
npx prisma studio

# 스키마 포맷팅
npx prisma format
```

### NestJS CLI
```bash
# 모듈 생성
nest g module <name>

# 컨트롤러 생성
nest g controller <name>

# 서비스 생성
nest g service <name>

# 전체 리소스 생성 (CRUD 포함)
nest g resource <name>
```

### 테스트
```bash
# 단위 테스트
npm run test

# E2E 테스트
npm run test:e2e

# 테스트 커버리지
npm run test:cov
```

### 코드 품질
```bash
# Biome 린트
npm run lint

# Biome 자동 수정
npm run lint:fix

# 포맷팅
npm run format
```

---

## 환경 설정

### .env 파일
```env
# 데이터베이스
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"

# JWT
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"

# 서버
PORT=3000
NODE_ENV=development
```

### 환경변수 사용
```typescript
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SomeService {
  constructor(private configService: ConfigService) {}

  getDbUrl() {
    return this.configService.get<string>('DATABASE_URL');
  }
}
```

---

## 에러 처리

### Built-in HTTP Exceptions
```typescript
import { 
  NotFoundException, 
  ConflictException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';

// 사용 예시
if (!user) {
  throw new NotFoundException('User not found');
}

if (existingEmail) {
  throw new ConflictException('Email already exists');
}
```

### 커스텀 Exception Filter
```typescript
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : 500;

    response.status(status).json({
      statusCode: status,
      message: exception.message,
      timestamp: new Date().toISOString(),
    });
  }
}
```

---

## 미들웨어 & 가드

### Middleware (요청 전처리)
```typescript
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    console.log(`${req.method} ${req.url}`);
    next();
  }
}
```

### Guard (인증/인가)
```typescript
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    return validateRequest(request);
  }
}

// 사용
@UseGuards(AuthGuard)
@Get('profile')
getProfile() {
  return 'Protected route';
}
```

---

## 파이프 (Validation)

### 전역 Validation Pipe 설정
```typescript
// main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,        // DTO에 없는 속성 제거
    forbidNonWhitelisted: true,  // 추가 속성 있으면 에러
    transform: true,        // 자동 타입 변환
  }));
  
  await app.listen(3000);
}
```

---

## 인터셉터 (응답 변환)

### 응답 변환 예시
```typescript
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
```

---

## 참고 자료

- [NestJS 공식 문서](https://docs.nestjs.com/)
- [Prisma 공식 문서](https://www.prisma.io/docs)
- [TypeScript 공식 문서](https://www.typescriptlang.org/docs/)
- [class-validator 문서](https://github.com/typestack/class-validator)

---

## 다음 단계

1. **인증/인가 구현**: JWT, Passport 사용
2. **파일 업로드**: Multer 사용
3. **API 문서화**: Swagger 적용
4. **테스트 작성**: Jest로 단위/통합 테스트
5. **로깅**: Winston, Pino 적용
6. **캐싱**: Redis 연동
7. **배포**: Docker, PM2 사용
