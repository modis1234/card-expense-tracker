# 카드 결제 내역 자동 분류 가계부

카드 이용내역(엑셀 업로드 / Gmail 승인 메일)을 수집하고 Gemini AI로 카테고리를 자동 분류하는 가계부 백엔드.

## 현재 진행 상황

### ✅ 구현됨 (backend)
- Google OAuth 로그인 + JWT 발급 (Gmail 읽기 권한 포함)
- 사용자 / 카드사 CRUD
- 카드사 엑셀 업로드 → 파싱 → 거래 저장 (현대카드 포맷)
- Gemini AI 카테고리 자동 분류 (배치) 및 거래 단건 재분류
- Gmail 카드 승인 메일 동기화 (현대카드, 초기 버전)
- Swagger API 문서 (`/api`)

### 📋 다음 작업
- [ ] 업로드 / 사용자 API에 JWT 인증 적용 (현재 테스트용 userId 사용)
- [ ] 카드 등록 + 카드 그룹(개인/모임 등 목적별) 기능
- [ ] 거래 내역 조회 API (기간·카드·그룹 필터)
- [ ] 카테고리 API, 통계 API
- [ ] Gmail 동기화 중복 저장 방지
- [ ] 타 카드사 파서 (하나카드 HTML 등)
- [ ] 프론트엔드 (Next.js)

---

## 기술 스택
- **Backend**: NestJS 11 + TypeScript
- **Database**: PostgreSQL + Prisma 7
- **Auth**: Google OAuth 2.0 + JWT (Passport)
- **AI**: Google Gemini (`@google/genai`)
- **Parsing**: xlsx (엑셀), cheerio (HTML)
- **Deploy**: Railway (backend)
- **Frontend (예정)**: Next.js

---

## 실행 방법

```bash
cd backend
npm install
cp .env.example .env              # 값 채우기
npx prisma migrate deploy         # 테이블 생성
psql "$DATABASE_URL" -f seed_categories.sql   # 카테고리 초기 데이터
npm run start:dev
```

- API: http://localhost:3000
- Swagger: http://localhost:3000/api
- 로그인: 브라우저에서 http://localhost:3000/auth/google → 응답의 `accessToken`을 Swagger `Authorize`에 입력
- DB 확인: `npx prisma studio`

> 카드사 데이터 시드는 아직 없으므로 `POST /card-companies`로 등록 (예: `{ "name": "현대카드", "code": "HYUNDAI" }`).
> 엑셀 업로드 시 파일명에 카드사명(`현대`, `hyundai` 등)이 포함되어야 카드사를 식별합니다.

---

## 프로젝트 구조

```
.
├── README.md
├── card-formats-analysis.md       # 카드사 엑셀 포맷 분석
├── sample-collection-guide.md     # 샘플 수집 가이드
├── backend/                       # NestJS 백엔드 (자세한 내용은 backend/README.md)
│   ├── src/                       # auth, users, card-companies, cards, files, gmail, transactions, database
│   ├── prisma/                    # schema.prisma, migrations
│   └── seed_categories.sql        # 카테고리 초기 데이터
├── docs/
│   ├── planning/                  # 기획 문서
│   ├── design/                    # 설계 문서
│   └── architecture/              # 아키텍처 문서
├── blog/                          # 개발 블로그 포스팅
└── samples/                       # 카드사별 샘플 파일
```

---

## 참고 문서

### 기획 문서
- [프로젝트 명세서](./docs/planning/project-specification.md)
- [프로젝트 요약](./docs/planning/project-summary.md)
- [프로젝트 기획서](./docs/planning/project-proposal.md)
- [개발 로드맵](./docs/planning/development-roadmap.md)
- [Gmail API 연동 계획](./docs/planning/gmail-integration-plan.md)

### 설계 문서
- [데이터베이스 스키마](./docs/design/database-schema.md)
- [카테고리 시드 데이터](./docs/design/categories-seed-data.md)
- [와이어프레임](./docs/design/wireframes.md)

### 아키텍처 문서
- **[현재 구현 아키텍처](./docs/architecture/current-architecture.md)** ← 실제 코드 기준, 먼저 읽기
- [아키텍처 의사결정 (ADR)](./docs/architecture/architecture-decisions.md)
- [시스템 아키텍처 v1](./docs/architecture/system-architecture.md) (폐기된 초기 설계안)
- [시스템 아키텍처 v2](./docs/architecture/system-architecture-v2.md) (설계안)

### 기타
- [카드사 포맷 분석](./card-formats-analysis.md)
- [샘플 수집 가이드](./sample-collection-guide.md)
- [백엔드 README](./backend/README.md)
