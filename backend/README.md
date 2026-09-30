# 카드 가계부 Backend

NestJS 기반 백엔드 API 서버

## 📚 NestJS란?

NestJS는 Node.js 기반의 서버 애플리케이션을 만들기 위한 프레임워크입니다. TypeScript를 기본으로 사용하며, Express 위에서 동작합니다.

### NestJS의 핵심 개념

1. **모듈 (Module)**: 관련된 기능들을 하나로 묶는 단위
   - 예: `UsersModule`, `AuthModule`, `DatabaseModule`
   - `@Module()` 데코레이터로 정의

2. **컨트롤러 (Controller)**: HTTP 요청을 받아서 처리하는 곳
   - 예: `GET /users`, `POST /auth/login`
   - `@Controller()` 데코레이터로 정의

3. **서비스 (Service)**: 실제 비즈니스 로직을 처리하는 곳
   - 데이터베이스 조회, 계산, 외부 API 호출 등
   - `@Injectable()` 데코레이터로 정의

4. **의존성 주입 (Dependency Injection)**: 필요한 것을 자동으로 연결해주는 기능
   - 생성자에 타입만 명시하면 NestJS가 자동으로 주입

### 간단한 예시

```typescript
// users.controller.ts - HTTP 요청 처리
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {} // 의존성 주입
  
  @Get()  // GET /users
  findAll() {
    return this.usersService.findAll();
  }
}

// users.service.ts - 비즈니스 로직
@Injectable()
export class UsersService {
  findAll() {
    return ['user1', 'user2'];
  }
}

// users.module.ts - 모듈로 묶기
@Module({
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
```

## 🛠 기술 스택

- **Framework**: NestJS (Node.js + TypeScript)
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: JWT + Passport
- **File Processing**: xlsx (엑셀), cheerio (HTML 파싱)
- **AI**: Google Gemini API (카테고리 자동 분류)
- **Validation**: class-validator (입력값 검증)
- **API Documentation**: Swagger/OpenAPI
- **Password Hashing**: bcrypt

## 🚀 시작하기

### 1. 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env` 파일 생성:

```bash
cp .env.example .env
```

필수 환경 변수:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
JWT_SECRET=your-secret-key
GEMINI_API_KEY=your-gemini-api-key
USE_AI_CATEGORIZATION=true
PORT=3000
```

### 3. 데이터베이스 설정

```bash
# Prisma 마이그레이션 (DB 테이블 생성)
npx prisma migrate dev

# Prisma Client 생성 (TypeScript 타입 생성)
npx prisma generate

# 카테고리 초기 데이터
psql "$DATABASE_URL" -f seed_categories.sql
```

### 4. 서버 실행

```bash
# 개발 모드 (파일 변경 시 자동 재시작)
npm run start:dev

# 프로덕션 빌드
npm run build
npm run start:prod
```

서버가 실행되면:
- API 서버: http://localhost:3000
- Swagger API 문서: http://localhost:3000/api

## 📁 프로젝트 구조 설명

```
src/
├── main.ts                 # 앱 시작점 (서버 실행)
├── app.module.ts           # 루트 모듈 (모든 모듈을 여기서 import)
├── app.controller.ts       # 루트 컨트롤러
├── app.service.ts          # 루트 서비스
│
├── database/               # 데이터베이스 설정
│   ├── database.module.ts  # Prisma 모듈
│   └── prisma.service.ts   # Prisma 서비스 (DB 연결)
│
├── auth/                   # 인증 관련
│   ├── auth.module.ts
│   ├── auth.controller.ts  # Google OAuth 로그인 API
│   ├── auth.service.ts     # JWT 토큰 생성/검증
│   ├── strategies/         # Google, JWT 전략
│   └── guards/             # 인증 가드 (보호된 라우트)
│
├── users/                  # 사용자 관리
│   ├── users.module.ts
│   ├── users.controller.ts # 사용자 CRUD API
│   ├── users.service.ts    # 사용자 비즈니스 로직
│   └── dto/                # 데이터 전송 객체 (입력값 정의)
│
├── card-companies/         # 카드사 CRUD
│   ├── card-companies.module.ts
│   ├── card-companies.controller.ts
│   ├── card-companies.service.ts
│   └── dto/
│
├── files/                  # 파일 업로드/파싱
│   ├── files.module.ts
│   ├── files.controller.ts # 파일 업로드 API
│   ├── files.service.ts    # 엑셀 파싱 + 거래 저장
│   └── ai.service.ts       # Gemini AI 카테고리 분류
│
└── gmail/                  # Gmail 카드 메일 동기화
    ├── gmail.module.ts
    ├── gmail.controller.ts
    └── gmail.service.ts

prisma/
└── schema.prisma           # 데이터베이스 스키마 정의
```

## 🔄 요청 흐름 이해하기

사용자가 API를 호출하면 다음 순서로 처리됩니다:

```
1. HTTP 요청 (예: GET /users/123)
   ↓
2. Controller가 요청을 받음
   @Get(':id')
   findOne(@Param('id') id: string)
   ↓
3. Service에서 비즈니스 로직 처리
   this.usersService.findOne(id)
   ↓
4. Prisma로 데이터베이스 조회
   this.prisma.user.findUnique({ where: { id } })
   ↓
5. 결과를 JSON으로 반환
```

## 🎯 주요 데코레이터 설명

NestJS는 데코레이터(`@`)를 많이 사용합니다:

- `@Module()`: 모듈 정의
- `@Controller()`: 컨트롤러 정의
- `@Injectable()`: 서비스 정의 (의존성 주입 가능)
- `@Get()`, `@Post()`, `@Put()`, `@Delete()`: HTTP 메서드
- `@Param()`: URL 파라미터 추출 (예: `/users/:id`)
- `@Body()`: 요청 본문 추출
- `@Query()`: 쿼리 파라미터 추출 (예: `/users?page=1`)
- `@UseGuards()`: 가드 적용 (인증, 권한 체크)

## 🗄️ 데이터베이스 (Prisma)

Prisma는 TypeScript 친화적인 ORM입니다.

### 기본 사용법

```typescript
// 조회
const user = await this.prisma.user.findUnique({ 
  where: { id: '123' } 
});

// 생성
const newUser = await this.prisma.user.create({
  data: { email: 'test@test.com', password: 'hashed' }
});

// 수정
const updated = await this.prisma.user.update({
  where: { id: '123' },
  data: { name: 'New Name' }
});

// 삭제
await this.prisma.user.delete({ where: { id: '123' } });

// 목록 조회 (페이징)
const users = await this.prisma.user.findMany({
  skip: 0,
  take: 10,
  where: { isActive: true }
});
```

### 스키마 수정 후

```bash
# 마이그레이션 생성 및 적용
npx prisma migrate dev --name add_new_field

# Prisma Client 재생성
npx prisma generate
```

## 🔐 인증 흐름

1. 회원가입: `POST /auth/register`
   - 비밀번호를 bcrypt로 해싱하여 저장

2. 로그인: `POST /auth/login`
   - 이메일/비밀번호 확인
   - JWT 토큰 발급

3. 보호된 API 호출
   - 헤더에 `Authorization: Bearer <token>` 포함
   - Guard가 토큰 검증
   - 통과하면 요청 처리

## 🧪 테스트

```bash
# 단위 테스트
npm run test

# E2E 테스트
npm run test:e2e

# 테스트 커버리지
npm run test:cov
```

## 🔍 유용한 명령어

```bash
# 코드 포맷팅
npm run format

# 린트 체크
npm run lint

# 린트 자동 수정
npm run lint:fix

# Prisma Studio (DB GUI)
npx prisma studio
```

## 🤖 AI 카테고리 자동 분류

### Gemini API 설정

1. **API 키 발급**
   - https://aistudio.google.com/app/apikey 접속
   - "Create API Key" 클릭
   - 생성된 키를 `.env`에 입력

2. **환경 변수 설정**
   ```env
   GEMINI_API_KEY="your-api-key"
   USE_AI_CATEGORIZATION=true
   ```

3. **동작 방식**
   - 엑셀 파일 업로드 시 자동으로 각 거래의 가맹점명 분석
   - DB에 저장된 카테고리 목록 중 가장 적절한 카테고리 자동 선택
   - 예: "스타벅스" → "식비", "GS25" → "편의점"

4. **수동 재분류**
   ```bash
   PUT /files/transactions/:id/recategorize
   ```

5. **AI 비활성화**
   ```env
   USE_AI_CATEGORIZATION=false
   ```
   - 모든 거래가 기본 카테고리로 저장됨

## 📖 더 배우기

- [NestJS 공식 문서](https://docs.nestjs.com/)
- [Prisma 공식 문서](https://www.prisma.io/docs)
- [NestJS 한국어 문서](https://docs.nestjs.kr/)

## 💡 팁

1. **모듈 생성**: `nest g module users`
2. **컨트롤러 생성**: `nest g controller users`
3. **서비스 생성**: `nest g service users`
4. **전체 리소스 생성**: `nest g resource users` (모듈+컨트롤러+서비스 한번에)

5. **디버깅**: `console.log()` 대신 NestJS Logger 사용
   ```typescript
   private readonly logger = new Logger(UsersService.name);
   this.logger.log('User created');
   ```

6. **환경 변수 사용**:
   ```typescript
   constructor(private configService: ConfigService) {}
   const dbUrl = this.configService.get<string>('DATABASE_URL');
   ```
