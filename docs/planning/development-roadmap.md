# 프로젝트 진행 단계별 상세 설계

## 전체 타임라인

```
Phase 0: 기획 (2주) ────────────────────────── 현재 진행 중
Phase 1: Backend 개발 (3-4주)
Phase 2: Frontend 개발 (3-4주)
Phase 3: 통합 및 테스트 (1-2주)
Phase 4: 모바일 앱 (4-6주) ─────────────────── 선택적
Phase 5: 고도화 (지속적)

총 예상 기간: 3-4개월 (모바일 제외 시 2-3개월)
```

---

## Phase 0: 기획 단계 (2주) - 현재

### Week 1: 요구사항 및 설계

#### Day 1-2: 카드사 포맷 조사 완료
- [x] 주요 5개 카드사 샘플 수집
- [ ] 각 카드사별 컬럼 구조 분석
- [ ] 공통 필드 정리
- [ ] 차이점 문서화

**산출물:**
- `card-formats-analysis.md` 완성
- `samples/` 디렉토리 정리

#### Day 3-4: 카테고리 체계 설계
- [ ] 대분류 정의 (8-10개)
- [ ] 중분류 정의 (각 대분류당 3-5개)
- [ ] 카테고리 아이콘 선정
- [ ] 색상 팔레트 정의
- [ ] 초기 시드 데이터 작성

**산출물:**
```
categories-design.md
├── 대분류
│   ├── 식비 (🍽️ #FF6B6B)
│   ├── 교통 (🚗 #4ECDC4)
│   ├── 쇼핑 (🛍️ #95E1D3)
│   ├── 주거/통신 (🏠 #F38181)
│   ├── 의료/건강 (⚕️ #AA96DA)
│   ├── 문화/여가 (🎬 #FCBAD3)
│   ├── 교육 (📚 #A8D8EA)
│   └── 기타 (📌 #FFFFD2)
└── 중분류 (각 대분류별)
```

#### Day 5-7: DB 스키마 설계
- [ ] ERD 작성 (draw.io, dbdiagram.io)
- [ ] 테이블 관계 정의
- [ ] 인덱스 전략 수립
- [ ] Prisma 스키마 초안 작성

**산출물:**
```prisma
// prisma/schema.prisma
model User {
  id            String         @id @default(uuid())
  email         String         @unique
  password      String
  name          String?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  transactions  Transaction[]
  files         File[]
}

model Category {
  id            String         @id @default(uuid())
  name          String
  parentId      String?
  parent        Category?      @relation("CategoryTree", fields: [parentId], references: [id])
  children      Category[]     @relation("CategoryTree")
  icon          String
  color         String
  transactions  Transaction[]
}

model Transaction {
  id            String         @id @default(uuid())
  userId        String
  user          User           @relation(fields: [userId], references: [id])
  categoryId    String
  category      Category       @relation(fields: [categoryId], references: [id])
  date          DateTime
  amount        Int
  merchantName  String
  description   String?
  cardCompany   String
  needsReview   Boolean        @default(false)
  confidence    Float?
  fileId        String?
  file          File?          @relation(fields: [fileId], references: [id])
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  
  @@index([userId, date])
  @@index([categoryId])
}

model File {
  id            String         @id @default(uuid())
  userId        String
  user          User           @relation(fields: [userId], references: [id])
  filename      String
  originalName  String
  fileUrl       String
  cardCompany   String
  uploadedAt    DateTime       @default(now())
  transactions  Transaction[]
}

model UserFeedback {
  id              String       @id @default(uuid())
  userId          String
  transactionId   String
  oldCategoryId   String
  newCategoryId   String
  merchantName    String
  createdAt       DateTime     @default(now())
}
```

### Week 2: UI/UX 설계 및 환경 준비

#### Day 8-10: 와이어프레임 작성
- [ ] 주요 화면 설계 (Figma, Excalidraw)
  - 로그인/회원가입
  - 파일 업로드
  - 거래 내역 목록
  - 거래 상세/수정
  - 대시보드 (통계)
  - 카테고리 관리
- [ ] 사용자 플로우 정의
- [ ] 컴포넌트 구조 설계

**산출물:**
```
wireframes/
├── 01-auth.png
├── 02-upload.png
├── 03-transactions-list.png
├── 04-transaction-detail.png
├── 05-dashboard.png
└── 06-categories.png
```

#### Day 11-12: 개발 환경 준비
- [ ] GitHub 레포지토리 생성
- [ ] 모노레포 vs 멀티레포 결정
- [ ] Supabase 프로젝트 생성
- [ ] Railway 계정 생성
- [ ] OpenAI API 키 발급
- [ ] 개발/스테이징/프로덕션 환경 분리

**산출물:**
```
레포지토리 구조 (모노레포 예시):
card-expense-tracker/
├── apps/
│   ├── backend/          # NestJS
│   └── web/              # Next.js
├── packages/
│   ├── types/            # 공통 타입
│   └── utils/            # 공통 유틸
├── docs/
├── .github/
│   └── workflows/        # CI/CD
└── package.json
```

#### Day 13-14: 기술 스택 최종 검증
- [ ] NestJS 프로젝트 초기화 테스트
- [ ] Prisma + Supabase 연결 테스트
- [ ] OpenAI API 호출 테스트
- [ ] Railway 배포 테스트

---

## Phase 1: Backend 개발 (3-4주)

### Week 1: 기본 인프라 구축

#### Day 1-2: 프로젝트 초기화
```bash
# NestJS 프로젝트 생성
npx @nestjs/cli new backend
cd backend

# 필수 패키지 설치
npm install @prisma/client prisma
npm install @nestjs/passport passport passport-jwt
npm install @nestjs/jwt bcrypt
npm install class-validator class-transformer
npm install xlsx xlsx-populate
npm install openai

# 개발 의존성
npm install -D @types/passport-jwt @types/bcrypt
npm install -D @types/multer
```

**작업 목록:**
- [ ] NestJS 프로젝트 생성
- [ ] 디렉토리 구조 설정
- [ ] ESLint, Prettier 설정
- [ ] 환경 변수 설정 (.env)
- [ ] Prisma 초기화

#### Day 3-4: Database 모듈
- [ ] Prisma 스키마 작성
- [ ] 마이그레이션 생성 및 실행
- [ ] PrismaService 구현
- [ ] 카테고리 시드 데이터 작성

```typescript
// src/database/prisma.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
```

```bash
# 마이그레이션 실행
npx prisma migrate dev --name init

# 시드 데이터 실행
npx prisma db seed
```

#### Day 5-7: Auth 모듈
- [ ] Users 모듈 생성
- [ ] Auth 모듈 생성
- [ ] JWT 전략 구현
- [ ] Auth Guard 구현
- [ ] 회원가입/로그인 API

**API 엔드포인트:**
```
POST /auth/register
POST /auth/login
POST /auth/refresh
GET  /auth/me
```

**테스트:**
```bash
# 회원가입
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# 로그인
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Week 2: 파일 처리 및 파싱

#### Day 8-10: Files 모듈
- [ ] Files 모듈 생성
- [ ] Multer 설정 (파일 업로드)
- [ ] Supabase Storage 연동
- [ ] 파일 메타데이터 저장

```typescript
// src/files/files.controller.ts
@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
    @Body('password') password?: string,
  ) {
    return this.filesService.processFile(file, user.id, password);
  }
}
```

#### Day 11-14: Parser 구현
- [ ] Base Parser 추상 클래스
- [ ] 신한카드 파서
- [ ] 삼성카드 파서
- [ ] 현대카드 파서
- [ ] KB국민카드 파서
- [ ] Parser Factory

```typescript
// src/files/parsers/base.parser.ts
export abstract class BaseParser {
  abstract identify(headers: string[]): boolean;
  abstract parse(workbook: any): ParsedTransaction[];
  
  protected normalizeDate(dateStr: string): Date {
    // 날짜 정규화 로직
  }
  
  protected normalizeAmount(amountStr: string): number {
    // 금액 정규화 로직
  }
}

// src/files/parsers/shinhan.parser.ts
export class ShinhanParser extends BaseParser {
  identify(headers: string[]): boolean {
    return headers.includes('이용일시') && 
           headers.includes('이용금액');
  }
  
  parse(workbook: any): ParsedTransaction[] {
    // 신한카드 파싱 로직
  }
}
```

### Week 3: AI 분류 및 거래 관리

#### Day 15-17: AI 모듈
- [ ] AI 모듈 생성
- [ ] OpenAI API 연동
- [ ] 프롬프트 엔지니어링
- [ ] 배치 처리 구현
- [ ] 재시도 로직

```typescript
// src/ai/ai.service.ts
@Injectable()
export class AiService {
  private openai: OpenAI;
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  
  async classifyTransaction(transaction: ParsedTransaction): Promise<ClassificationResult> {
    const prompt = this.buildPrompt(transaction);
    
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: '당신은 거래 내역을 분류하는 AI입니다.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
      });
      
      return this.parseResponse(response);
    } catch (error) {
      // 재시도 로직
    }
  }
  
  async classifyBatch(transactions: ParsedTransaction[]): Promise<ClassificationResult[]> {
    // 배치 처리 (병렬 처리, 속도 제한 고려)
  }
}
```

#### Day 18-21: Transactions 모듈
- [ ] Transactions 모듈 생성
- [ ] CRUD API 구현
- [ ] 배치 생성 API
- [ ] 필터링/정렬/페이지네이션
- [ ] 카테고리 수정 시 피드백 저장

**API 엔드포인트:**
```
GET    /transactions              # 목록 조회
GET    /transactions/:id          # 상세 조회
POST   /transactions              # 단일 생성
POST   /transactions/batch        # 일괄 생성
PATCH  /transactions/:id          # 수정
DELETE /transactions/:id          # 삭제
```

### Week 4: 통계 및 최적화

#### Day 22-24: Statistics 모듈
- [ ] Statistics 모듈 생성
- [ ] 요약 통계 API
- [ ] 카테고리별 통계 API
- [ ] 월별 통계 API
- [ ] 트렌드 분석 API

```typescript
// src/statistics/statistics.service.ts
@Injectable()
export class StatisticsService {
  async getSummary(userId: string, period: Period): Promise<Summary> {
    const { startDate, endDate } = this.getPeriodDates(period);
    
    const result = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
      _count: true,
    });
    
    return this.formatSummary(result);
  }
}
```

#### Day 25-28: 최적화 및 테스트
- [ ] DB 인덱스 최적화
- [ ] 쿼리 성능 개선
- [ ] 에러 처리 개선
- [ ] 로깅 추가
- [ ] 단위 테스트 작성
- [ ] E2E 테스트 작성
- [ ] API 문서화 (Swagger)

```bash
# Swagger 설정
npm install @nestjs/swagger

# 테스트 실행
npm run test
npm run test:e2e
```

---

## Phase 2: Frontend 개발 (3-4주)

### Week 1: 프로젝트 초기화 및 인증

#### Day 1-2: Next.js 프로젝트 설정
```bash
# Next.js 프로젝트 생성
npx create-next-app@latest web --typescript --tailwind --app

cd web

# 필수 패키지 설치
npm install axios
npm install @tanstack/react-query
npm install zustand
npm install react-hook-form zod @hookform/resolvers
npm install date-fns
npm install recharts
npm install lucide-react
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
```

**작업 목록:**
- [ ] Next.js 프로젝트 생성
- [ ] Tailwind CSS 설정
- [ ] 디렉토리 구조 설정
- [ ] API 클라이언트 설정
- [ ] React Query 설정

```typescript
// src/lib/api-client.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

#### Day 3-7: 인증 UI
- [ ] 로그인 페이지
- [ ] 회원가입 페이지
- [ ] Auth Context/Store
- [ ] Protected Route
- [ ] 레이아웃 구성

```typescript
// app/login/page.tsx
'use client';

export default function LoginPage() {
  const { register, handleSubmit } = useForm();
  const router = useRouter();
  
  const onSubmit = async (data) => {
    const response = await apiClient.post('/auth/login', data);
    localStorage.setItem('token', response.data.token);
    router.push('/dashboard');
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email')} type="email" />
      <input {...register('password')} type="password" />
      <button type="submit">로그인</button>
    </form>
  );
}
```

### Week 2: 파일 업로드 및 거래 목록

#### Day 8-10: 파일 업로드 UI
- [ ] 파일 업로드 컴포넌트
- [ ] 드래그 앤 드롭
- [ ] 업로드 진행 상태
- [ ] 비밀번호 입력 (암호화 파일)
- [ ] 업로드 결과 표시

```typescript
// app/upload/page.tsx
'use client';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const handleUpload = async () => {
    const formData = new FormData();
    formData.append('file', file);
    
    setUploading(true);
    try {
      await apiClient.post('/files/upload', formData);
      router.push('/transactions');
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <div>
      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <button onClick={handleUpload} disabled={uploading}>
        {uploading ? '업로드 중...' : '업로드'}
      </button>
    </div>
  );
}
```

#### Day 11-14: 거래 목록 UI
- [ ] 거래 목록 테이블
- [ ] 필터링 (날짜, 카테고리, 금액)
- [ ] 정렬
- [ ] 페이지네이션
- [ ] 검색

### Week 3: 거래 상세 및 대시보드

#### Day 15-17: 거래 상세/수정
- [ ] 거래 상세 모달
- [ ] 카테고리 수정
- [ ] 메모 추가
- [ ] 삭제 기능

#### Day 18-21: 대시보드 (통계)
- [ ] 요약 카드 (총 지출, 거래 건수)
- [ ] 카테고리별 파이 차트
- [ ] 월별 트렌드 라인 차트
- [ ] 카테고리별 바 차트
- [ ] 기간 선택 (이번 달, 지난 달, 최근 3개월)

```typescript
// app/dashboard/page.tsx
'use client';

export default function DashboardPage() {
  const { data: summary } = useQuery({
    queryKey: ['statistics', 'summary'],
    queryFn: () => apiClient.get('/statistics/summary'),
  });
  
  return (
    <div>
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <h3>총 지출</h3>
          <p>{summary?.totalAmount}원</p>
        </Card>
        {/* ... */}
      </div>
      
      <PieChart data={summary?.byCategory} />
      <LineChart data={summary?.byMonth} />
    </div>
  );
}
```

### Week 4: 카테고리 관리 및 최적화

#### Day 22-24: 카테고리 관리
- [ ] 카테고리 목록
- [ ] 카테고리 생성/수정/삭제
- [ ] 아이콘/색상 선택

#### Day 25-28: 최적화 및 마무리
- [ ] 로딩 상태 개선
- [ ] 에러 처리 개선
- [ ] 반응형 디자인
- [ ] 다크 모드 (선택적)
- [ ] 성능 최적화
- [ ] Vercel 배포

---

## Phase 3: 통합 및 테스트 (1-2주)

### Week 1: 통합 테스트

#### Day 1-3: E2E 테스트
- [ ] 회원가입 → 로그인 플로우
- [ ] 파일 업로드 → 거래 생성 플로우
- [ ] 거래 조회 → 수정 플로우
- [ ] 통계 조회 플로우

#### Day 4-7: 버그 수정 및 개선
- [ ] 발견된 버그 수정
- [ ] UX 개선
- [ ] 성능 최적화
- [ ] 에러 메시지 개선

### Week 2: 배포 및 문서화

#### Day 8-10: 배포
- [ ] Backend Railway 배포
- [ ] Frontend Vercel 배포
- [ ] 환경 변수 설정
- [ ] 도메인 연결 (선택적)
- [ ] HTTPS 설정

#### Day 11-14: 문서화
- [ ] README 작성
- [ ] API 문서 정리
- [ ] 사용자 가이드
- [ ] 개발자 가이드
- [ ] 배포 가이드

---

## Phase 4: 모바일 앱 (4-6주) - 선택적

### Week 1-2: React Native 프로젝트 설정
- [ ] Expo 프로젝트 생성
- [ ] 네비게이션 설정
- [ ] API 연동
- [ ] 인증 구현

### Week 3-4: 핵심 기능 구현
- [ ] 파일 업로드 (카메라, 갤러리)
- [ ] 거래 목록
- [ ] 거래 상세/수정
- [ ] 대시보드

### Week 5-6: 테스트 및 배포
- [ ] 테스트
- [ ] 앱 아이콘, 스플래시 스크린
- [ ] App Store 제출
- [ ] Google Play 제출

---

## Phase 5: 고도화 (지속적)

### 우선순위 1: 사용자 피드백 반영
- [ ] 사용자 피드백 수집
- [ ] 버그 수정
- [ ] UX 개선

### 우선순위 2: 성능 개선
- [ ] Redis 캐싱 도입
- [ ] DB 쿼리 최적화
- [ ] 이미지 최적화

### 우선순위 3: 기능 추가
- [ ] Gmail API 연동
  - OAuth 2.0 인증
  - 카드사 이메일 자동 수집
  - 첨부파일/HTML 파싱
- [ ] 암호화된 엑셀 파일 지원
  - 비밀번호 입력 UI
  - 생년월일 자동 시도
- [ ] 예산 관리
- [ ] 알림 기능
- [ ] 리포트 내보내기 (PDF, Excel)

### 우선순위 4: 확장
- [ ] 가족 계정
- [ ] 다중 카드 지원
- [ ] 더 많은 카드사 지원

---

## 체크리스트

### Phase 0 완료 조건
- [ ] 카드사 포맷 분석 완료
- [ ] 카테고리 체계 확정
- [ ] DB 스키마 확정
- [ ] 와이어프레임 완성
- [ ] 개발 환경 준비 완료

### Phase 1 완료 조건
- [ ] 모든 API 엔드포인트 구현
- [ ] 단위 테스트 통과
- [ ] API 문서화 완료
- [ ] Railway 배포 성공

### Phase 2 완료 조건
- [ ] 모든 화면 구현
- [ ] Backend API 연동 완료
- [ ] 반응형 디자인 적용
- [ ] Vercel 배포 성공

### Phase 3 완료 조건
- [ ] E2E 테스트 통과
- [ ] 주요 버그 수정 완료
- [ ] 프로덕션 배포 완료
- [ ] 문서화 완료

---

## 다음 액션

**지금 바로 시작할 수 있는 작업:**

1. **카테고리 체계 설계** (1-2일)
2. **DB 스키마 작성** (1-2일)
3. **와이어프레임 작성** (2-3일)
4. **개발 환경 준비** (1일)

어떤 작업부터 시작하시겠습니까?
