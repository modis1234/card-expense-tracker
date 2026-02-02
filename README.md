# 카드 결제 내역 자동 분류 가계부 프로젝트

## 현재 진행 상황

### Phase 0: 기획 단계 (진행 중)

#### ✅ 완료된 작업
- [x] 프로젝트 명세서 작성 (`project-specification.md`)
- [x] 시장 조사 완료
- [x] 기술 스택 선정

#### 🔄 진행 중인 작업
- [ ] **카드사 엑셀 포맷 조사** (현재 단계)
  - 문서: `card-formats-analysis.md`
  - 가이드: `sample-collection-guide.md`
  - 샘플 저장 위치: `samples/` 디렉토리

#### 📋 다음 작업
- [ ] 카테고리 체계 설계
- [ ] DB 스키마 설계 (ERD)
- [ ] 와이어프레임 작성
- [ ] NestJS 프로젝트 초기화
- [ ] Next.js 프로젝트 초기화
- [ ] Supabase 프로젝트 생성
- [ ] Railway 계정 생성

---

## 프로젝트 구조

```
.
├── README.md                      # 프로젝트 개요 및 진행 상황
├── docs/                          # 문서 디렉토리
│   ├── planning/                  # 기획 문서
│   │   ├── project-specification.md
│   │   ├── project-summary.md
│   │   ├── project-proposal.md
│   │   └── development-roadmap.md
│   ├── design/                    # 설계 문서
│   │   ├── database-schema.md
│   │   ├── categories-seed-data.md
│   │   └── wireframes/
│   └── architecture/              # 아키텍처 문서
│       ├── system-architecture.md
│       ├── system-architecture-v2.md
│       └── architecture-decisions.md
├── card-formats-analysis.md       # 카드사 포맷 분석
├── sample-collection-guide.md     # 샘플 수집 가이드
└── samples/                       # 카드사별 샘플 파일
    ├── shinhan/
    ├── samsung/
    ├── hyundai/
    ├── kb/
    └── lotte/
```

---

## 다음 단계 액션

### 1. 카드사 샘플 수집 (우선순위: 높음)
- 각 카드사 웹사이트/앱에서 이용내역 엑셀 다운로드
- `samples/` 디렉토리에 저장
- 개인정보 마스킹 처리

### 2. 포맷 분석
- `card-formats-analysis.md` 문서 작성
- 각 카드사별 컬럼 구조 파악
- 공통 필드 및 차이점 정리

### 3. 파싱 전략 수립
- 카드사 자동 식별 로직
- 데이터 추출 및 정규화 방법
- 테스트 케이스 작성

---

## 참고 문서

### 기획 문서
- [프로젝트 명세서](./docs/planning/project-specification.md)
- [프로젝트 요약](./docs/planning/project-summary.md)
- [프로젝트 기획서](./docs/planning/project-proposal.md)
- [개발 로드맵](./docs/planning/development-roadmap.md)

### 설계 문서
- [데이터베이스 스키마](./docs/design/database-schema.md)
- [카테고리 시드 데이터](./docs/design/categories-seed-data.md)

### 아키텍처 문서
- [시스템 아키텍처 v1](./docs/architecture/system-architecture.md)
- [시스템 아키텍처 v2](./docs/architecture/system-architecture-v2.md)
- [아키텍처 의사결정](./docs/architecture/architecture-decisions.md)

### 기타
- [카드사 포맷 분석](./card-formats-analysis.md)
- [샘플 수집 가이드](./sample-collection-guide.md)

---

## 기술 스택 (확정)
- **Frontend Web**: Next.js 15+ (App Router)
- **Frontend Mobile**: React Native + Expo
- **Backend**: NestJS + TypeScript
- **Database**: Supabase PostgreSQL + Prisma
- **AI**: OpenAI API (초기) → AWS Bedrock (성장 후)
- **Infrastructure**: Vercel (Frontend) + Railway (Backend)

## 아키텍처
```
사용자 → Next.js (Vercel) → NestJS (Railway) → Supabase PostgreSQL
                                ↓
                           OpenAI API
```
