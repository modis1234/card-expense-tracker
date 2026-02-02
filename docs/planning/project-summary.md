# 카드 결제 내역 자동 분류 가계부 - 최종 정리

## 프로젝트 개요
여러 카드사의 엑셀 결제 내역을 업로드하면 AI가 자동으로 카테고리를 분류해주는 풀스택 가계부 앱

**타겟 사용자**: 은행 API 연동을 꺼리는 프라이버시 중시 사용자

---

## 최종 기술 스택 (최종 확정)

### Frontend
- **Web**: Next.js 15+ (App Router) + Vercel (무료)
- **Mobile**: React Native + Expo

### Backend
- **Framework**: NestJS + TypeScript
- **배포**: Railway (무료 $5 크레딧/월) 또는 Render
- **역할**: 
  - 엑셀 파일 파싱 (카드사별 파서)
  - AI 분류 로직
  - 비즈니스 로직
  - 데이터 검증 및 보안

### Database & Storage
- **Database**: Supabase (PostgreSQL) - 무료 500MB
- **ORM**: Prisma
- **Storage**: Supabase Storage - 무료 1GB
- **Auth**: Supabase Auth (또는 NestJS JWT)

### AI
- **초기**: OpenAI API ($5 크레딧)
- **성장 후**: AWS Bedrock (Claude 3.5) 고려

### 배포
- **Frontend**: Vercel (무료)
- **Backend**: Railway (무료)
- **Mobile**: Expo / App Store, Google Play

---

## 비용 구조

### Phase 1: MVP (사용자 0-100명)
```
Frontend (Vercel): $0 (무료 티어)
Backend (Railway): $0 (무료 $5 크레딧/월)
Database (Supabase): $0 (무료 티어)
AI (OpenAI): $5-10/월

총: $5-10/월
```

### Phase 2: 성장기 (사용자 100-1000명)
```
Frontend (Vercel): $0-20/월
Backend (Railway): $5-20/월
Database (Supabase): $25/월 (Pro 플랜)
AI (OpenAI): $20-50/월

총: $50-115/월
```

### Phase 3: 대규모 (검증 후 AWS 전환 고려)
```
Frontend (Vercel/CloudFront): $20-50/월
Backend (ECS Fargate): $30-50/월
Database (RDS): $25-50/월
Storage (S3): $5-10/월
AI (Bedrock): $30-100/월

총: $110-260/월
```

---

## 수익 모델 (나중에 고려)

### Freemium 모델
```
무료: 월 100건 거래 분류
Basic: $4.99/월 (무제한)
Pro: $9.99/월 (가족 계정, 고급 분석)
```

### 초기 전략
- 수익화 없이 사용자 확보 우선
- MAU 1,000명 이상 달성 후 수익화 고려

---

## 현재 진행 상황

### ✅ 완료
- 프로젝트 명세서 작성
- 시장 조사
- 기술 스택 선정 (수정 완료)

### 🔄 진행 중
- 카드사 엑셀 포맷 조사
- 샘플 수집 (`samples/` 디렉토리)

### 📋 다음 작업
1. 카테고리 체계 설계
2. DB 스키마 설계 (ERD)
3. 와이어프레임 작성
4. Supabase 프로젝트 세팅
5. 개발 시작

---

## 개발 로드맵

### Phase 0: 기획 (2주) - 현재 단계
- 카드사 포맷 분석
- DB 스키마 설계
- UI/UX 설계

### Phase 1: MVP (8-12주)
**Backend 개발 (3-4주)**
- NestJS 프로젝트 초기화
- Prisma + Supabase 연결
- 인증 API (JWT 또는 Supabase Auth)
- 엑셀 파일 업로드 API
- 카드사별 파서 구현
- AI 분류 서비스
- 거래 내역 CRUD API
- Railway 배포

**Frontend 개발 (3-4주)**
- Next.js 프로젝트 초기화
- Backend API 연동
- 파일 업로드 UI
- 거래 내역 목록/상세
- 카테고리 관리
- 기본 통계 대시보드
- Vercel 배포

**통합 및 테스트 (1-2주)**
- E2E 테스트
- 성능 최적화
- 버그 수정

### Phase 2: 모바일 (4-6주)
- React Native 앱 개발
- 앱 스토어 배포

### Phase 3: 고도화
- Gmail API 연동
- 고급 분석 기능
- 예산 관리
- 사용자 피드백 학습

**총 예상 기간**: 4-5개월

---

## 핵심 의사결정 요약

### 1. Backend 개발: NestJS ✅
**이유**:
- 복잡한 비즈니스 로직 (엑셀 파싱, AI 분류)
- 서버 사이드 검증 및 보안
- 확장 가능한 아키텍처
- 풀스택 개발 경험
- 포트폴리오 가치

**역할 분리**:
```
Frontend (Next.js):
- UI/UX
- 클라이언트 상태 관리
- 라우팅

Backend (NestJS):
- 엑셀 파싱 (카드사별)
- AI 분류 로직
- 비즈니스 로직
- 데이터 검증
- 보안

Database (Supabase):
- 데이터 저장
- 인증 (선택적)
```

### 2. DB 선택: Supabase PostgreSQL ✅
**이유**:
- PostgreSQL (관계형) - 복잡한 쿼리 가능
- 무료 티어 충분 (500MB)
- Prisma와 완벽 호환
- 나중에 AWS RDS로 이동 쉬움

**Firebase를 선택하지 않은 이유**:
- NoSQL은 관계형 데이터에 부적합
- 복잡한 통계 쿼리 제한적
- JOIN, GROUP BY 불가능
- 집계 함수 약함

### 3. Frontend: Next.js (백엔드 있어도 사용) ✅
**이유**:
- Vercel 무료 배포 및 최적화
- 파일 기반 라우팅 (편의성)
- 자동 코드 스플리팅
- 이미지 최적화
- 산업 표준 (포트폴리오)
- 나중에 SSR 필요 시 쉽게 전환

**오버엔지니어링 아님**:
- 복잡한 비즈니스 로직 존재
- 확장 계획 명확
- 표준적인 아키텍처
- 각 레이어의 역할 명확

### 4. 비용 최소화 전략
- 무료 티어로 시작 (Railway + Supabase + Vercel)
- 검증 후 AWS 전환 고려
- 초기 월 $5-10로 운영 가능

### 5. 수익화
- 초기에는 무료 제공
- 사용자 확보 우선
- 1,000명 이상 시 Freemium 도입

---

## 기술 스택 변경 이력

### 원래 계획 (project-specification.md)
```
Backend: NestJS
Database: PostgreSQL + Prisma
Infrastructure: AWS (ECS Fargate, RDS, S3)
AI: AWS Bedrock
```

### 1차 수정 (비용 고려)
```
Backend: Supabase (Backend-as-a-Service)
Database: Supabase (PostgreSQL)
Infrastructure: Vercel + Supabase
AI: OpenAI API
```

### 최종 확정 (현재)
```
Frontend: Next.js + Vercel
Backend: NestJS + Railway
Database: Supabase (PostgreSQL) + Prisma
Storage: Supabase Storage
AI: OpenAI API → Bedrock (나중에)
```

### 최종 결정 이유
1. **복잡한 로직**: 엑셀 파싱, AI 분류 등 서버 처리 필요
2. **확장성**: Gmail API 연동, 고급 기능 추가 계획
3. **보안**: 민감한 금융 데이터 서버 검증 필수
4. **학습**: 풀스택 개발 경험 및 포트폴리오 가치
5. **비용**: Railway 무료 티어로 시작 가능
6. **표준**: 실무에서 사용하는 아키텍처 패턴

---

## 다음 액션

### 즉시 착수
1. **카드사 포맷 조사 완료** (진행 중)
   - 신한, 삼성, 현대, KB, 롯데 샘플 수집
   - 공통 필드 및 차이점 정리

2. **DB 스키마 설계**
   - ERD 작성
   - 테이블 관계 정의
   - Supabase 마이그레이션 파일 작성

3. **카테고리 체계 설계**
   - 대분류/중분류 정의
   - 아이콘 및 색상 선정

4. **와이어프레임 작성**
   - 주요 화면 설계
   - 사용자 플로우 정의

### 개발 시작 전
1. GitHub 레포지토리 생성 (모노레포 또는 분리)
2. Supabase 프로젝트 생성
3. NestJS 프로젝트 초기화
4. Next.js 프로젝트 초기화
5. Prisma 스키마 작성
6. Railway 계정 생성

---

## 참고 문서
- [프로젝트 명세서](./project-specification.md) - 초기 계획
- [카드사 포맷 분석](./card-formats-analysis.md)
- [샘플 수집 가이드](./sample-collection-guide.md)
- [README](./README.md) - 진행 상황

---

## 아키텍처 다이어그램

```
┌─────────────────────────────────────┐
│  사용자 (Web/Mobile)                │
└──────────┬──────────────────────────┘
           │
┌──────────▼──────────────────────────┐
│  Next.js Frontend (Vercel)          │
│  - UI/UX                            │
│  - 클라이언트 상태 관리              │
│  - 라우팅                           │
└──────────┬──────────────────────────┘
           │ REST API
┌──────────▼──────────────────────────┐
│  NestJS Backend (Railway)           │
│  - 엑셀 파싱 (카드사별)             │
│  - AI 분류 로직                     │
│  - 비즈니스 로직                    │
│  - 데이터 검증                      │
└──────┬───────────┬──────────────────┘
       │           │
       │           └─────────────┐
       │                         │
┌──────▼──────────┐    ┌─────────▼──────┐
│  Supabase       │    │  OpenAI API    │
│  - PostgreSQL   │    │  - GPT-4       │
│  - Storage      │    │  - 카테고리    │
│  - Auth         │    │    분류        │
└─────────────────┘    └────────────────┘
```

---

## 업데이트 이력
- 2026-01-30: 기술 스택 최종 확정 (NestJS Backend 추가)
- 2026-01-30: 비용 구조 분석 업데이트
- 2026-01-30: 아키텍처 결정 이유 추가
- 2026-01-30: 개발 로드맵 상세화
