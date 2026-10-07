# 시스템 아키텍처 및 플로우 (NestJS Backend 포함)

> ⚠️ **설계안 문서입니다.** 실제 구현과 다릅니다 (AI는 Gemini, 인증은 Google OAuth, Parser/Statistics/Feedback 서비스 및 프론트엔드 미구현 등).
> 현재 구현은 [현재 구현 아키텍처](./current-architecture.md)를 참고하세요.

## 전체 시스템 아키텍처

```mermaid
graph TB
    subgraph "사용자"
        User[👤 사용자]
    end

    subgraph "Frontend - Vercel"
        Web[🌐 Next.js Web App]
        Mobile[📱 React Native App]
    end

    subgraph "Backend API - Railway"
        API[🔌 NestJS API Server]
        
        subgraph "Controllers"
            AuthCtrl[Auth Controller]
            FileCtrl[Files Controller]
            TxCtrl[Transactions Controller]
            StatsCtrl[Statistics Controller]
        end
        
        subgraph "Services"
            AuthSvc[Auth Service]
            FileSvc[Files Service]
            ParserSvc[Parser Service]
            AISvc[AI Service]
            TxSvc[Transactions Service]
            StatsSvc[Statistics Service]
        end
        
        subgraph "Data Layer"
            Prisma[Prisma ORM]
        end
    end

    subgraph "Database - Supabase"
        DB[(🗄️ PostgreSQL)]
        Storage[📦 Storage]
    end

    subgraph "External Services"
        OpenAI[🤖 OpenAI API]
    end

    User --> Web
    User --> Mobile
    
    Web --> API
    Mobile --> API
    
    API --> AuthCtrl
    API --> FileCtrl
    API --> TxCtrl
    API --> StatsCtrl
    
    AuthCtrl --> AuthSvc
    FileCtrl --> FileSvc
    TxCtrl --> TxSvc
    StatsCtrl --> StatsSvc
    
    FileSvc --> ParserSvc
    FileSvc --> AISvc
    TxSvc --> AISvc
    
    AuthSvc --> Prisma
    FileSvc --> Storage
    ParserSvc --> AISvc
    AISvc --> OpenAI
    TxSvc --> Prisma
    StatsSvc --> Prisma
    
    Prisma --> DB
```

---

## NestJS Backend 구조 상세

### 모듈 구조

```
backend/
├── src/
│   ├── main.ts                    # 애플리케이션 진입점
│   ├── app.module.ts              # 루트 모듈
│   │
│   ├── auth/                      # 인증 모듈
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts     # POST /auth/register, /auth/login
│   │   ├── auth.service.ts        # JWT 생성, 비밀번호 해싱
│   │   ├── guards/
│   │   │   └── jwt-auth.guard.ts  # JWT 검증 가드
│   │   └── strategies/
│   │       └── jwt.strategy.ts    # Passport JWT 전략
│   │
│   ├── users/                     # 사용자 모듈
│   │   ├── users.module.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   └── dto/
│   │       ├── create-user.dto.ts
│   │       └── update-user.dto.ts
│   │
│   ├── files/                     # 파일 업로드 모듈
│   │   ├── files.module.ts
│   │   ├── files.controller.ts    # POST /files/upload
│   │   ├── files.service.ts       # 파일 저장, 파싱 조율
│   │   ├── parsers/               # 카드사별 파서
│   │   │   ├── base.parser.ts     # 추상 파서 클래스
│   │   │   ├── shinhan.parser.ts  # 신한카드 파서
│   │   │   ├── samsung.parser.ts  # 삼성카드 파서
│   │   │   ├── hyundai.parser.ts  # 현대카드 파서
│   │   │   ├── kb.parser.ts       # KB국민카드 파서
│   │   │   └── parser.factory.ts  # 파서 팩토리
│   │   └── dto/
│   │       └── upload-file.dto.ts
│   │
│   ├── ai/                        # AI 분류 모듈
│   │   ├── ai.module.ts
│   │   ├── ai.service.ts          # OpenAI API 호출
│   │   ├── prompts/
│   │   │   └── category-prompt.ts # 프롬프트 템플릿
│   │   └── dto/
│   │       └── classify-transaction.dto.ts
│   │
│   ├── transactions/              # 거래 내역 모듈
│   │   ├── transactions.module.ts
│   │   ├── transactions.controller.ts
│   │   ├── transactions.service.ts
│   │   └── dto/
│   │       ├── create-transaction.dto.ts
│   │       ├── update-transaction.dto.ts
│   │       └── query-transaction.dto.ts
│   │
│   ├── categories/                # 카테고리 모듈
│   │   ├── categories.module.ts
│   │   ├── categories.controller.ts
│   │   ├── categories.service.ts
│   │   └── dto/
│   │       └── create-category.dto.ts
│   │
│   ├── statistics/                # 통계 모듈
│   │   ├── statistics.module.ts
│   │   ├── statistics.controller.ts
│   │   ├── statistics.service.ts  # 집계 쿼리
│   │   └── dto/
│   │       └── statistics-query.dto.ts
│   │
│   ├── database/                  # 데이터베이스 모듈
│   │   ├── database.module.ts
│   │   └── prisma.service.ts      # Prisma 클라이언트
│   │
│   └── common/                    # 공통 모듈
│       ├── filters/
│       │   └── http-exception.filter.ts
│       ├── interceptors/
│       │   └── logging.interceptor.ts
│       └── decorators/
│           └── current-user.decorator.ts
│
├── prisma/
│   ├── schema.prisma              # DB 스키마
│   └── migrations/                # 마이그레이션 파일
│
├── test/
├── .env
├── .env.example
├── package.json
├── tsconfig.json
└── nest-cli.json
```

---

## 핵심 기능별 플로우

### 1. 사용자 인증 플로우

```mermaid
sequenceDiagram
    actor User
    participant Web as Next.js
    participant API as NestJS API
    participant AuthCtrl as Auth Controller
    participant AuthSvc as Auth Service
    participant Prisma as Prisma ORM
    participant DB as PostgreSQL

    User->>Web: 회원가입/로그인
    Web->>API: POST /auth/register or /auth/login
    API->>AuthCtrl: 요청 전달
    AuthCtrl->>AuthSvc: 인증 처리
    
    alt 회원가입
        AuthSvc->>AuthSvc: 비밀번호 해싱 (bcrypt)
        AuthSvc->>Prisma: 사용자 생성
        Prisma->>DB: INSERT INTO users
        DB-->>Prisma: 생성 완료
    else 로그인
        AuthSvc->>Prisma: 사용자 조회
        Prisma->>DB: SELECT FROM users
        DB-->>Prisma: 사용자 정보
        AuthSvc->>AuthSvc: 비밀번호 검증
    end
    
    AuthSvc->>AuthSvc: JWT 토큰 생성
    AuthSvc-->>AuthCtrl: 토큰 반환
    AuthCtrl-->>API: 200 OK + JWT
    API-->>Web: 응답
    Web->>Web: 토큰 저장 (localStorage)
    Web-->>User: 로그인 완료
```

---

### 2. 엑셀 파일 업로드 및 분류 플로우

```mermaid
sequenceDiagram
    actor User
    participant Web as Next.js
    participant API as NestJS API
    participant FileCtrl as Files Controller
    participant FileSvc as Files Service
    participant Storage as Supabase Storage
    participant Parser as Parser Service
    participant AISvc as AI Service
    participant OpenAI as OpenAI API
    participant TxSvc as Transactions Service
    participant Prisma as Prisma ORM
    participant DB as PostgreSQL

    User->>Web: 엑셀 파일 선택 및 업로드
    Web->>API: POST /files/upload<br/>multipart/form-data
    API->>FileCtrl: 파일 수신
    
    FileCtrl->>FileSvc: 파일 처리 요청
    FileSvc->>Storage: 파일 저장
    Storage-->>FileSvc: 파일 URL
    
    FileSvc->>Parser: 파일 파싱 요청
    Parser->>Parser: 카드사 식별<br/>(헤더 분석)
    Parser->>Parser: 적절한 파서 선택<br/>(Factory Pattern)
    Parser->>Parser: 데이터 추출 및 정규화
    Parser-->>FileSvc: 거래 내역 배열
    
    FileSvc->>AISvc: 배치 분류 요청
    
    loop 각 거래 내역 (배치 처리)
        AISvc->>AISvc: 프롬프트 생성
        AISvc->>OpenAI: 카테고리 분류 요청
        OpenAI-->>AISvc: 카테고리 + 신뢰도
    end
    
    AISvc-->>FileSvc: 분류된 거래 내역
    
    FileSvc->>TxSvc: 거래 내역 저장 요청
    TxSvc->>Prisma: 트랜잭션 시작
    Prisma->>DB: BEGIN TRANSACTION
    
    loop 각 거래
        Prisma->>DB: INSERT INTO transactions
    end
    
    Prisma->>DB: COMMIT
    DB-->>Prisma: 저장 완료
    Prisma-->>TxSvc: 결과 반환
    TxSvc-->>FileSvc: 성공
    
    FileSvc-->>FileCtrl: 처리 완료 + 통계
    FileCtrl-->>API: 200 OK
    API-->>Web: 성공 응답
    Web-->>User: 업로드 완료 알림
```

---

### 3. 거래 내역 조회 및 통계 플로우

```mermaid
sequenceDiagram
    actor User
    participant Web as Next.js
    participant API as NestJS API
    participant Guard as JWT Auth Guard
    participant TxCtrl as Transactions Controller
    participant TxSvc as Transactions Service
    participant StatsCtrl as Statistics Controller
    participant StatsSvc as Statistics Service
    participant Prisma as Prisma ORM
    participant DB as PostgreSQL

    User->>Web: 대시보드 접속
    
    Web->>API: GET /transactions?period=month<br/>Authorization: Bearer {token}
    API->>Guard: 토큰 검증
    Guard->>Guard: JWT 디코딩, user_id 추출
    Guard-->>API: 인증 성공
    
    API->>TxCtrl: 요청 전달
    TxCtrl->>TxSvc: 거래 조회 요청
    TxSvc->>Prisma: findMany with relations
    Prisma->>DB: SELECT t.*, c.*<br/>FROM transactions t<br/>JOIN categories c<br/>WHERE user_id = ?
    DB-->>Prisma: 거래 내역 + 카테고리
    Prisma-->>TxSvc: 데이터 반환
    TxSvc-->>TxCtrl: 거래 목록
    TxCtrl-->>API: 200 OK + 데이터
    API-->>Web: JSON 응답
    
    Web->>API: GET /statistics/summary?period=month
    API->>Guard: 토큰 검증
    Guard-->>API: 인증 성공
    
    API->>StatsCtrl: 요청 전달
    StatsCtrl->>StatsSvc: 통계 계산 요청
    StatsSvc->>Prisma: 집계 쿼리
    Prisma->>DB: SELECT category_id,<br/>SUM(amount), COUNT(*)<br/>FROM transactions<br/>GROUP BY category_id
    DB-->>Prisma: 집계 결과
    Prisma-->>StatsSvc: 데이터
    StatsSvc->>StatsSvc: 비율 계산, 순위 정렬
    StatsSvc-->>StatsCtrl: 통계 데이터
    StatsCtrl-->>API: 200 OK
    API-->>Web: JSON 응답
    
    Web->>Web: 차트 렌더링
    Web-->>User: 대시보드 표시
```

---

### 4. 카테고리 수정 및 학습 플로우

```mermaid
sequenceDiagram
    actor User
    participant Web as Next.js
    participant API as NestJS API
    participant TxCtrl as Transactions Controller
    participant TxSvc as Transactions Service
    participant Feedback as Feedback Service
    participant Prisma as Prisma ORM
    participant DB as PostgreSQL

    User->>Web: 거래 카테고리 수정
    Web->>API: PATCH /transactions/:id<br/>{ categoryId: 5 }
    
    API->>TxCtrl: 요청 전달
    TxCtrl->>TxSvc: 업데이트 요청
    
    TxSvc->>Prisma: 트랜잭션 시작
    Prisma->>DB: BEGIN TRANSACTION
    
    Prisma->>DB: UPDATE transactions<br/>SET category_id = 5<br/>WHERE id = ?
    DB-->>Prisma: 업데이트 완료
    
    TxSvc->>Feedback: 피드백 기록
    Feedback->>Prisma: 피드백 저장
    Prisma->>DB: INSERT INTO user_feedback
    DB-->>Prisma: 저장 완료
    
    Feedback->>Feedback: 패턴 분석<br/>(동일 거래명 확인)
    
    Prisma->>DB: COMMIT
    DB-->>Prisma: 완료
    
    Prisma-->>TxSvc: 성공
    TxSvc-->>TxCtrl: 업데이트 완료
    TxCtrl-->>API: 200 OK
    API-->>Web: 성공 응답
    Web-->>User: 수정 완료 알림
    
    Note over DB: 향후 AI 재학습에 활용
```

---

## AI 분류 프로세스 상세

```mermaid
flowchart TD
    A[거래 내역 배열] --> B[AI Service]
    
    B --> C{배치 처리 준비}
    
    C --> D[거래 1]
    C --> E[거래 2]
    C --> F[거래 N]
    
    D --> G{유효성 검증}
    E --> G
    F --> G
    
    G -->|금액 0원 이하| H[제외]
    G -->|거래명 없음| H
    G -->|정상| I[프롬프트 생성]
    
    I --> J[거래명 정제<br/>특수문자 제거]
    J --> K[컨텍스트 추가<br/>금액, 날짜, 가맹점]
    K --> L[OpenAI API 호출<br/>GPT-4]
    
    L --> M{응답 파싱}
    
    M -->|성공| N[카테고리 ID 추출]
    M -->|실패| O{재시도 카운트}
    
    O -->|< 3회| L
    O -->|>= 3회| P[기본 카테고리<br/>'기타']
    
    N --> Q{신뢰도 확인}
    Q -->|높음 >80%| R[자동 확정]
    Q -->|중간 50-80%| S[확정 + 플래그<br/>needs_review]
    Q -->|낮음 <50%| T[사용자 확인 필요<br/>needs_review]
    
    P --> R
    R --> U[결과 객체 생성]
    S --> U
    T --> U
    
    U --> V[배치 결과 반환]
    V --> W[Transactions Service]
    W --> X[일괄 DB 저장]
```

---

## 데이터 흐름도

```mermaid
flowchart LR
    A[엑셀 파일] --> B[Next.js 업로드]
    B --> C[NestJS API]
    
    C --> D[Files Controller]
    D --> E[Files Service]
    
    E --> F[Supabase Storage]
    E --> G[Parser Service]
    
    G --> H{카드사 식별}
    H -->|신한| I[Shinhan Parser]
    H -->|삼성| J[Samsung Parser]
    H -->|현대| K[Hyundai Parser]
    H -->|KB| L[KB Parser]
    H -->|기타| M[Base Parser]
    
    I --> N[정규화된 데이터]
    J --> N
    K --> N
    L --> N
    M --> N
    
    N --> O[AI Service]
    O --> P[OpenAI API 호출]
    P --> Q[카테고리 결과]
    
    Q --> R[Transactions Service]
    R --> S[Prisma ORM]
    S --> T[PostgreSQL 저장]
    
    T --> U[Statistics Service]
    U --> V[Next.js 대시보드]
```

---

## 보안 플로우

```mermaid
sequenceDiagram
    actor User
    participant Web as Next.js
    participant API as NestJS API
    participant Guard as JWT Auth Guard
    participant Strategy as JWT Strategy
    participant Prisma as Prisma ORM
    participant DB as PostgreSQL

    User->>Web: 로그인
    Web->>API: POST /auth/login
    API-->>Web: JWT 토큰
    Web->>Web: 토큰 저장
    
    User->>Web: 보호된 리소스 요청
    Web->>API: GET /transactions<br/>Authorization: Bearer {token}
    
    API->>Guard: 요청 가로채기
    Guard->>Strategy: 토큰 검증
    
    Strategy->>Strategy: JWT 디코딩
    Strategy->>Strategy: 만료 시간 확인
    
    alt 토큰 유효
        Strategy->>Prisma: 사용자 조회
        Prisma->>DB: SELECT FROM users<br/>WHERE id = ?
        DB-->>Prisma: 사용자 정보
        Prisma-->>Strategy: 사용자 객체
        Strategy-->>Guard: 인증 성공 + user
        Guard-->>API: req.user 설정
        API->>API: 비즈니스 로직 실행
        API-->>Web: 200 OK + 데이터
    else 토큰 무효/만료
        Strategy-->>Guard: 인증 실패
        Guard-->>API: UnauthorizedException
        API-->>Web: 401 Unauthorized
    end
```

---

## 에러 처리 플로우

```mermaid
flowchart TD
    A[클라이언트 요청] --> B[NestJS API]
    
    B --> C{Global Validation Pipe}
    C -->|DTO 유효| D[Controller]
    C -->|DTO 무효| E[400 Bad Request<br/>ValidationException]
    
    D --> F{JWT Auth Guard}
    F -->|토큰 유효| G[Service Layer]
    F -->|토큰 무효| H[401 Unauthorized<br/>UnauthorizedException]
    
    G --> I{비즈니스 로직 실행}
    
    I -->|성공| J[200 OK<br/>성공 응답]
    I -->|실패| K{Exception Filter}
    
    K -->|BadRequestException| L[400 Bad Request]
    K -->|UnauthorizedException| M[401 Unauthorized]
    K -->|ForbiddenException| N[403 Forbidden]
    K -->|NotFoundException| O[404 Not Found]
    K -->|ConflictException| P[409 Conflict]
    K -->|InternalServerErrorException| Q[500 Internal Error]
    K -->|기타 에러| Q
    
    Q --> R[Global Exception Filter]
    R --> S[Error Logger]
    S --> T[Sentry 전송]
    T --> U[관리자 알림]
    
    E --> V[에러 응답<br/>JSON 형식]
    H --> V
    L --> V
    M --> V
    N --> V
    O --> V
    P --> V
    Q --> V
    
    J --> W[성공 응답<br/>JSON 형식]
```

---

## 배포 아키텍처

```mermaid
graph TB
    subgraph "사용자"
        U1[웹 브라우저]
        U2[모바일 앱]
    end
    
    subgraph "Vercel Edge Network"
        V1[Global CDN]
        V2[Next.js App<br/>SSR/SSG]
    end
    
    subgraph "Railway Cloud"
        R1[NestJS API<br/>Docker Container]
        R2[Auto Scaling]
        R3[Health Check]
    end
    
    subgraph "Supabase Cloud"
        S1[PostgreSQL<br/>Primary]
        S2[PostgreSQL<br/>Replica]
        S3[Storage<br/>S3 Compatible]
        S4[Auth Service]
    end
    
    subgraph "OpenAI"
        O1[GPT-4 API<br/>Endpoint]
    end
    
    subgraph "Monitoring"
        M1[Sentry<br/>Error Tracking]
        M2[Railway Logs]
    end
    
    U1 --> V1
    U2 --> R1
    V1 --> V2
    V2 --> R1
    
    R1 --> R2
    R1 --> R3
    
    R1 --> S1
    S1 --> S2
    R1 --> S3
    R1 --> S4
    R1 --> O1
    
    R1 --> M1
    R1 --> M2
```

---

## 성능 최적화 전략

```mermaid
graph TB
    A[클라이언트 요청] --> B[NestJS API]
    
    B --> C{캐싱 레이어<br/>Redis 선택적}
    C -->|Cache Hit| D[캐시된 데이터<br/>즉시 반환]
    C -->|Cache Miss| E[Service Layer]
    
    E --> F[Prisma ORM]
    
    F --> G{쿼리 최적화}
    G -->|인덱스 활용| H[DB 조회]
    G -->|SELECT 최소화| H
    G -->|JOIN 최적화| H
    G -->|페이지네이션| H
    G -->|Eager Loading| H
    
    H --> I[PostgreSQL]
    I --> J[결과 반환]
    
    J --> K{캐시 저장<br/>TTL 설정}
    K --> L[클라이언트 응답]
    
    subgraph "최적화 기법"
        M[DB 인덱싱<br/>user_id, date]
        N[쿼리 최적화<br/>N+1 방지]
        O[배치 처리<br/>AI 호출]
        P[캐싱<br/>Redis 선택적]
        Q[CDN<br/>Vercel Edge]
        R[Connection Pool<br/>Prisma]
    end
```

---

## API 엔드포인트 설계

### 인증 (Auth)
```
POST   /auth/register          # 회원가입
POST   /auth/login             # 로그인
POST   /auth/refresh           # 토큰 갱신
GET    /auth/me                # 현재 사용자 정보
```

### 파일 (Files)
```
POST   /files/upload           # 엑셀 파일 업로드
GET    /files                  # 업로드 파일 목록
GET    /files/:id              # 파일 상세
DELETE /files/:id              # 파일 삭제
```

### 거래 내역 (Transactions)
```
GET    /transactions           # 거래 목록 조회
GET    /transactions/:id       # 거래 상세
POST   /transactions           # 거래 생성 (수동)
PATCH  /transactions/:id       # 거래 수정
DELETE /transactions/:id       # 거래 삭제
POST   /transactions/batch     # 일괄 생성
```

### 카테고리 (Categories)
```
GET    /categories             # 카테고리 목록
GET    /categories/:id         # 카테고리 상세
POST   /categories             # 카테고리 생성
PATCH  /categories/:id         # 카테고리 수정
DELETE /categories/:id         # 카테고리 삭제
```

### 통계 (Statistics)
```
GET    /statistics/summary     # 요약 통계
GET    /statistics/by-category # 카테고리별 통계
GET    /statistics/by-month    # 월별 통계
GET    /statistics/trends      # 트렌드 분석
```

---

## 향후 확장 계획

```mermaid
graph TB
    subgraph "Phase 1 - MVP 현재"
        P1[엑셀 업로드]
        P2[AI 분류]
        P3[기본 통계]
    end
    
    subgraph "Phase 2 - 고도화"
        P4[Gmail API 연동<br/>자동 수집]
        P5[예산 관리<br/>알림 기능]
        P6[고급 분석<br/>패턴 인식]
        P7[Redis 캐싱<br/>성능 향상]
    end
    
    subgraph "Phase 3 - 확장"
        P8[가족 계정<br/>멀티 유저]
        P9[리포트 내보내기<br/>PDF, Excel]
        P10[모바일 앱<br/>React Native]
        P11[AWS 마이그레이션<br/>대규모 트래픽]
    end
    
    P1 --> P4
    P2 --> P5
    P3 --> P6
    P2 --> P7
    
    P4 --> P8
    P5 --> P9
    P6 --> P10
    P7 --> P11
```

---

## 개발 우선순위

### 1단계: 핵심 Backend API (2주)
- [ ] NestJS 프로젝트 초기화
- [ ] Prisma 스키마 작성
- [ ] Auth 모듈 (JWT)
- [ ] Users 모듈
- [ ] Categories 모듈 (시드 데이터)

### 2단계: 파일 처리 (1-2주)
- [ ] Files 모듈
- [ ] 카드사별 파서 구현
- [ ] Parser Factory 패턴

### 3단계: AI 분류 (1주)
- [ ] AI 모듈
- [ ] OpenAI API 연동
- [ ] 프롬프트 최적화

### 4단계: 거래 관리 (1주)
- [ ] Transactions 모듈
- [ ] CRUD API
- [ ] 배치 처리

### 5단계: 통계 (1주)
- [ ] Statistics 모듈
- [ ] 집계 쿼리 최적화
- [ ] 캐싱 전략

### 6단계: 배포 (3-5일)
- [ ] Railway 설정
- [ ] 환경 변수 관리
- [ ] CI/CD 파이프라인
- [ ] 모니터링 설정
