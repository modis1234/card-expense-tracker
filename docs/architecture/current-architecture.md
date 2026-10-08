# 현재 구현 아키텍처 (As-Built)

> **이 문서가 기준 문서입니다.** `backend/src` 실제 코드 기준으로 작성했습니다.
> [시스템 아키텍처 v1](./system-architecture.md) / [v2](./system-architecture-v2.md)는 초기 설계안이며, 구현과 다른 부분이 많습니다 (아래 [설계안과 차이](#설계안과-차이) 참고).
>
> 마지막 갱신: 2026-10-07

---

## 전체 구성

```mermaid
graph TB
    Client[클라이언트<br/>Swagger UI /api 등<br/>※ 프론트엔드 미구현]

    subgraph "NestJS API (backend/)"
        Auth[AuthModule<br/>Google OAuth → JWT]
        Files[FilesModule<br/>엑셀 업로드·파싱·저장]
        AI[AIService<br/>Gemini 분류]
        Gmail[GmailModule<br/>명세서 메일 불러오기]
        Tx[TransactionsModule<br/>거래 조회]
        Cards[CardsModule<br/>카드 / 카드그룹]
        CC[CardCompaniesModule]
        Users[UsersModule]
        DB[DatabaseModule<br/>PrismaService]
    end

    PG[(PostgreSQL<br/>Supabase 또는 로컬)]
    Google[Google OAuth /<br/>Gmail API]
    Gemini[Google Gemini API]

    Client --> Auth & Files & Gmail & Tx & Cards & CC & Users
    Auth --> Google
    Gmail --> Google
    Files --> AI
    Gmail --> Files
    AI --> Gemini
    Auth & Files & Gmail & Tx & Cards & CC & Users --> DB
    DB --> PG
```

| 구분 | 사용 기술 |
|---|---|
| 서버 | NestJS, 전역 `ValidationPipe`(whitelist, transform), Swagger(`/api`) |
| DB | PostgreSQL + Prisma (`@prisma/adapter-pg`), `DB_SSL`로 Supabase/로컬 전환 |
| 인증 | Google OAuth(passport-google, `gmail.readonly` scope) → 자체 JWT (기본 7일) |
| AI | Google Gemini `gemini-3-flash-preview` (`@google/genai`) |
| 파싱 | `xlsx`(엑셀), `cheerio`(메일 HTML) |
| 배포 설정 | `backend/railway.toml`, `backend/Procfile` |
| 프론트엔드 | 없음 |

---

## 모듈 구조

```
backend/src/
├── main.ts                     # CORS, ValidationPipe, Swagger(/api)
├── app.module.ts               # 아래 모듈 전부 import, ConfigModule(global)
├── database/                   # PrismaService (모든 모듈이 사용)
├── auth/                       # Google OAuth 콜백 → 사용자 upsert + Gmail 토큰 저장 + JWT 발급
│   ├── guards/jwt-auth.guard.ts
│   └── strategies/             # google.strategy.ts, jwt.strategy.ts
├── users/                      # 사용자 CRUD
├── card-companies/             # 카드사 마스터 CRUD
├── cards/                      # 카드(끝 4자리) / 카드그룹 CRUD (컨트롤러 2개)
├── files/                      # 엑셀 업로드 + 재분류 + AIService
│   ├── files.service.ts        # 파싱·카드 매칭·저장을 한 서비스에서 처리
│   └── ai.service.ts           # Gemini 호출 (GmailModule도 사용)
├── gmail/                      # Gmail 하나카드 명세서 메일 → FilesService로 저장
└── transactions/               # 거래 조회 (GET만)
```

모듈 의존: 모든 모듈 → `DatabaseModule`, `GmailModule` → `FilesModule`(명세서 저장 경로 재사용).

---

## 데이터 모델 (`backend/prisma/schema.prisma`)

```mermaid
erDiagram
    User ||--o{ CardGroup : owns
    User ||--o{ Card : owns
    User ||--o{ File : uploads
    User ||--o{ Transaction : owns
    CardCompany ||--o{ Card : issues
    CardCompany ||--o{ Transaction : ""
    CardGroup ||--o{ Card : groups
    Card ||--o{ Transaction : "cardId (nullable)"
    File ||--o{ Transaction : "fileId (nullable)"
    Category ||--o{ Transaction : classifies
    Transaction ||--o{ UserFeedback : ""
```

- `Card`는 `(userId, cardCompanyId, last4)` 유니크. 업로드 시 처음 보는 카드는 그룹 없이 자동 등록됩니다.
- `Transaction.confidence`(0.00~1.00) / `needsReview`: AI 분류 신뢰도. 0.80 미만이면 `needsReview = true`.
- `UserFeedback`: 테이블만 있고 코드에서 사용하지 않습니다.

---

## API 엔드포인트

`/auth/*`, `/users/*` 외에는 모두 `JwtAuthGuard`(Bearer 토큰) 적용.

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/auth/google` | Google 로그인 시작 |
| GET | `/auth/google/callback` | 콜백 → `{ accessToken, user }` |
| POST/GET/GET/PATCH/DELETE | `/users`, `/users/:id` | 사용자 CRUD (**가드 없음**) |
| POST/GET/GET/PATCH/DELETE | `/card-companies`, `/card-companies/:id` | 카드사 CRUD |
| POST/GET/PATCH/DELETE | `/cards`, `/cards/:id` | 내 카드 CRUD |
| POST/GET/PATCH/DELETE | `/card-groups`, `/card-groups/:id` | 카드그룹 CRUD |
| POST | `/files/upload` | 엑셀 업로드 (`file`, xlsx/xls) |
| PUT | `/files/transactions/:id/recategorize` | 거래 1건 Gemini 재분류 |
| POST | `/gmail/sync` | Gmail 하나카드 명세서 메일 불러오기 |
| GET | `/transactions?groupId&cardId&from&to` | 거래 조회 (페이지네이션 없음) |

---

## 핵심 플로우

### 1. 로그인

```mermaid
sequenceDiagram
    actor U as 사용자
    participant A as AuthController
    participant G as Google
    participant S as AuthService
    participant DB as PostgreSQL

    U->>A: GET /auth/google
    A->>G: OAuth 동의 (email, profile, gmail.readonly)
    G-->>A: GET /auth/google/callback
    A->>S: googleLogin(req.user)
    S->>DB: 사용자 조회/생성 + Gmail access/refresh 토큰 저장
    S-->>U: { accessToken(JWT), user }
    Note over U: 이후 요청: Authorization: Bearer {JWT}<br/>JwtStrategy가 req.user = { userId, email }
```

### 2. 엑셀 업로드 (핵심 기능)

```mermaid
sequenceDiagram
    actor U as 사용자
    participant C as FilesController
    participant F as FilesService
    participant AI as AIService
    participant Gm as Gemini
    participant DB as PostgreSQL

    U->>C: POST /files/upload (xlsx)
    C->>F: parseAndSaveExcel(buffer, userId, fileInfo)
    F->>F: 파일명으로 카드사 코드 판별 (현대/신한/하나...)
    F->>F: XLSX 파싱 (9행부터, 현대카드 컬럼 고정)
    F->>DB: File 생성
    opt USE_AI_CATEGORIZATION=true
        F->>AI: categorizeBatch(가맹점명[], 카테고리명[])
        AI->>Gm: JSON [{index, category, confidence}]
        AI-->>F: 입력 순서대로 결과
    end
    F->>DB: 카드 끝 4자리로 Card upsert
    F->>DB: Transaction createMany (category, confidence, needsReview)
    C-->>U: { message }
```

- 카드사 판별은 **파일명** 기준입니다. 엑셀 컬럼 매핑은 현대카드 형식 하나로 고정되어 있어, 다른 카드사 엑셀은 사실상 지원하지 않습니다.
- AI 결과가 없거나 카테고리 목록에 없으면 첫 번째 활성 카테고리로 저장하고 `needsReview = true`로 둡니다.

### 3. Gmail 명세서 불러오기

```mermaid
sequenceDiagram
    actor U as 사용자
    participant S as GmailService
    participant GA as Gmail API
    participant F as FilesService
    participant DB as PostgreSQL

    U->>S: POST /gmail/sync (거래내역 '불러오기' 버튼)
    S->>DB: 저장된 Gmail 토큰 조회 (만료 시 refresh token으로 갱신·저장)
    S->>GA: '이용대금명세서 (from:hanacard.co.kr OR 하나카드) newer_than:1y' 검색 (최대 12통)
    loop 메일마다
        S->>S: 본문 text/html 파트 추출 (charset 디코딩)
        S->>F: parseAndSaveFile (업로드와 같은 경로: 파싱·AI 분류·저장)
        F-->>S: 저장 건수 또는 409(이미 등록된 청구월)·400(파싱 실패)
    end
    S-->>U: 확인한 메일 수, 저장한 명세서, 건너뛴 메일과 이유
```

- 메일 본문이 명세서 HTML 그 자체인 경우만 처리합니다. 보안메일(암호화 첨부)은 건너뜁니다.
- 같은 카드사·청구월 거래가 이미 있으면 저장하지 않아(409), 직접 업로드한 명세서와 중복되지 않습니다.

### 4. 재분류

`PUT /files/transactions/:id/recategorize` → `AIService.categorizeTransaction` → 카테고리와 함께 `confidence`, `needsReview`를 갱신합니다.

---

## 설계안과 차이

| 항목 | 설계안 (v2 / ADR) | 현재 구현 |
|---|---|---|
| AI | OpenAI → AWS Bedrock (ADR-004) | Gemini ([ADR-007](./architecture-decisions.md#adr-007-ai-서비스-변경-gemini)) |
| 인증 | 이메일/비밀번호 회원가입·로그인 | Google OAuth만 |
| 파서 | Parser Service + 카드사별 파서 + Factory | `FilesService` 내부 메서드, 현대카드 형식만 |
| 저장 경로 | AI Service → Transactions Service | `FilesService` / `GmailService`가 직접 Prisma 저장 |
| 파일 저장 | Supabase Storage | 원본 파일 저장 안 함 (`File.fileUrl`에 생성한 파일명만 기록) |
| Transactions | CRUD + 배치 | 조회만 |
| Categories / Statistics 모듈 | 있음 | 없음 (카테고리는 `seed_categories.sql`) |
| Feedback Service | 수정 이력 학습 | 없음 (`UserFeedback` 테이블만) |
| 공통 필터·인터셉터 (`common/`) | 있음 | 없음 |
| Frontend | Next.js (Vercel) | 없음 |
| Gmail 연동 | Phase 2 계획 | 구현됨 (하나카드 명세서 메일) |
| 카드 / 카드그룹 | 설계에 없음 | 구현됨 |

---

## 알려진 한계

- `/users` 엔드포인트에 인증 가드가 없습니다.
- `needsReview` 거래만 골라 조회하는 API가 없습니다.
- `/transactions` 조회에 페이지네이션이 없습니다.
- 청구월이 없는 현대카드 엑셀은 같은 파일을 다시 올리면 중복 저장됩니다.
- 하나카드 HTML 명세서(`samples/hana/`)는 분석만 했고 파서는 없습니다.
