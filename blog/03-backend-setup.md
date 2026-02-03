# [카드 가계부 만들기 #3] NestJS 백엔드 프로젝트 초기화

## 들어가며

기획과 포맷 분석이 끝났으니, 이제 본격적으로 개발을 시작합니다. 첫 번째로 NestJS 백엔드 프로젝트를 초기화하고 기본 구조를 잡아보겠습니다.

## NestJS 프로젝트 생성

### 1. 프로젝트 생성

```bash
cd card-expense-tracker
npx @nestjs/cli new backend --package-manager npm --skip-git
```

생성된 기본 구조:
```
backend/
├── src/
│   ├── app.controller.ts
│   ├── app.module.ts
│   ├── app.service.ts
│   └── main.ts
├── test/
├── package.json
└── tsconfig.json
```

### 2. 필수 패키지 설치

```bash
cd backend

# 핵심 패키지
npm install @prisma/client prisma @nestjs/config

# 인증
npm install @nestjs/passport passport passport-jwt @nestjs/jwt bcrypt

# 유효성 검사
npm install class-validator class-transformer

# 파일 처리
npm install xlsx cheerio

# 타입 정의
npm install -D @types/passport-jwt @types/bcrypt @types/multer
```

## Prisma 설정

### 1. Prisma 초기화

```bash
npx prisma init
```

생성된 파일:
- `prisma/schema.prisma` - 데이터베이스 스키마
- `.env` - 환경 변수

### 2. Prisma 스키마 작성

`prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String         @id @default(uuid())
  email        String         @unique
  password     String
  name         String?
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
  
  transactions Transaction[]
  files        File[]
  feedbacks    UserFeedback[]
  
  @@map("users")
}

model Category {
  id           String         @id @default(uuid())
  name         String
  parentId     String?
  parent       Category?      @relation("CategoryTree", fields: [parentId], references: [id])
  children     Category[]     @relation("CategoryTree")
  icon         String
  color        String
  order        Int
  isActive     Boolean        @default(true)
  
  transactions Transaction[]
  
  @@index([parentId])
  @@index([isActive, order])
  @@map("categories")
}

model Transaction {
  id            String         @id @default(uuid())
  userId        String
  user          User           @relation(fields: [userId], references: [id])
  categoryId    String
  category      Category       @relation(fields: [categoryId], references: [id])
  date          DateTime       @db.Date
  amount        Int
  merchantName  String
  description   String?        @db.Text
  cardCompany   String
  needsReview   Boolean        @default(false)
  confidence    Decimal?       @db.Decimal(3, 2)
  fileId        String?
  file          File?          @relation(fields: [fileId], references: [id])
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  
  feedbacks     UserFeedback[]
  
  @@index([userId, date(sort: Desc)])
  @@index([categoryId])
  @@map("transactions")
}

model File {
  id            String         @id @default(uuid())
  userId        String
  user          User           @relation(fields: [userId], references: [id])
  filename      String
  originalName  String
  fileUrl       String         @db.Text
  fileSize      Int
  cardCompany   String
  uploadedAt    DateTime       @default(now())
  status        String         @default("completed")
  
  transactions  Transaction[]
  
  @@index([userId, uploadedAt(sort: Desc)])
  @@map("files")
}

model UserFeedback {
  id              String       @id @default(uuid())
  userId          String
  user            User         @relation(fields: [userId], references: [id])
  transactionId   String
  transaction     Transaction  @relation(fields: [transactionId], references: [id])
  oldCategoryId   String
  newCategoryId   String
  merchantName    String
  createdAt       DateTime     @default(now())
  
  @@index([merchantName])
  @@map("user_feedbacks")
}
```

### 3. 환경 변수 설정

`.env.example`:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/card_expense_tracker?schema=public"

# JWT
JWT_SECRET="your-secret-key-change-this-in-production"
JWT_EXPIRES_IN="7d"

# OpenAI
OPENAI_API_KEY="your-openai-api-key"

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR="./uploads"

# Server
PORT=3000
NODE_ENV=development
```

## Database 모듈 구현

### 1. PrismaService 생성

`src/database/prisma.service.ts`:

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

### 2. DatabaseModule 생성

`src/database/database.module.ts`:

```typescript
import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
```

`@Global()` 데코레이터로 전역 모듈로 설정하여 다른 모듈에서 import 없이 사용 가능합니다.

## AppModule 설정

`src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

## Main 설정

`src/main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // CORS 활성화
  app.enableCors();
  
  // 전역 Validation Pipe
  app.useGlobalPipes(new ValidationPipe({ 
    whitelist: true,    // DTO에 없는 속성 제거
    transform: true,    // 타입 자동 변환
  }));
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`🚀 Server running on http://localhost:${port}`);
}
bootstrap();
```

## 프로젝트 구조

```
backend/
├── prisma/
│   └── schema.prisma          # Prisma 스키마
├── src/
│   ├── database/
│   │   ├── prisma.service.ts  # Prisma 서비스
│   │   └── database.module.ts # Database 모듈
│   ├── auth/                  # 인증 (다음 단계)
│   ├── users/                 # 사용자 관리
│   ├── files/                 # 파일 업로드/파싱
│   ├── transactions/          # 거래 내역
│   ├── categories/            # 카테고리
│   ├── statistics/            # 통계
│   ├── app.module.ts
│   └── main.ts
├── .env.example
├── package.json
└── README.md
```

## 데이터베이스 마이그레이션

### 1. 마이그레이션 생성 및 실행

```bash
npx prisma migrate dev --name init
```

이 명령어는:
- 마이그레이션 파일 생성
- 데이터베이스에 스키마 적용
- Prisma Client 생성

### 2. Prisma Studio (선택)

데이터베이스 GUI 도구:

```bash
npx prisma studio
```

브라우저에서 `http://localhost:5555` 접속

## 서버 실행

### 개발 모드

```bash
npm run start:dev
```

파일 변경 시 자동 재시작됩니다.

### 프로덕션 빌드

```bash
npm run build
npm run start:prod
```

## 테스트

```bash
# 단위 테스트
npm run test

# E2E 테스트
npm run test:e2e

# 커버리지
npm run test:cov
```

## 다음 단계

1. **Auth 모듈 구현**
   - JWT 전략
   - 회원가입/로그인 API
   - Auth Guard

2. **Files 모듈 구현**
   - 파일 업로드
   - 카드사별 파서
   - 데이터 추출

3. **Transactions 모듈 구현**
   - CRUD API
   - 필터링/정렬
   - AI 카테고리 분류

## 트러블슈팅

### Prisma Client 생성 안 됨

```bash
npx prisma generate
```

### 포트 충돌

`.env` 파일에서 `PORT` 변경

### 데이터베이스 연결 실패

`.env`의 `DATABASE_URL` 확인

## 다음 포스팅 예고

다음 글에서는 **Auth 모듈 구현**을 다룰 예정입니다.
- JWT 인증 전략
- 회원가입/로그인 API
- Passport Guard 설정
- 비밀번호 해싱

---

**시리즈 목록:**
- [카드 가계부 만들기 #1] 프로젝트 시작
- [카드 가계부 만들기 #2] 카드사 포맷 분석
- [카드 가계부 만들기 #3] NestJS 백엔드 초기화 (현재 글)
- [카드 가계부 만들기 #4] Auth 모듈 구현 (작성 예정)

궁금한 점이나 개선 사항이 있으시면 댓글로 남겨주세요! 🙌
