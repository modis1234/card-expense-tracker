# AI 기반 카드 결제 내역 자동 분류 가계부 시스템

## 프로젝트 개요

### 프로젝트 목표
여러 카드사의 엑셀 결제 내역 파일을 업로드하면 ML/LLM을 활용하여 자동으로 카테고리를 분류해주는 풀스택 가계부 시스템 개발

### 핵심 기능
- 여러 카드사의 엑셀 결제 내역 파일 업로드
- ML/LLM 기반 자동 카테고리 분류
- 웹 및 모바일 크로스 플랫폼 지원
- (선택) Gmail API 연동을 통한 메일 첨부파일 자동 수집

### 목표 사용자
- 은행 API 연동을 꺼리는 프라이버시 중시 사용자
- 여러 카드를 사용하는 개인/가정
- 수동 가계부 작성에 피로를 느끼는 사용자

### 시장 차별화 포인트
1. **엑셀 업로드 방식** - API 연동 없이 사용 가능 (프라이버시 우려 해소)
2. **여러 카드사 통합** - 다양한 포맷의 엑셀 파일 처리
3. **한국 시장 특화** - 한국 카드사 포맷 및 한글 거래 내역 최적화

---

## 기술 스택

### Frontend (Web)
- **Framework**: Next.js 15+ (App Router)
- **Language**: TypeScript
- **상세 라이브러리**: 개발 단계에서 결정
- **배포**: AWS Amplify 또는 CloudFront + S3

### Frontend (Mobile)
- **Framework**: React Native + Expo
- **Language**: TypeScript
- **Target Platform**: Android + iOS
- **배포**: App Store, Google Play

### Backend
- **Runtime**: Node.js
- **Language**: TypeScript
- **Framework**: NestJS (추천)
  - TypeScript 네이티브 지원
  - 엔터프라이즈급 아키텍처
  - 모듈화 및 확장성 우수
  - Prisma와 궁합 우수
- **API Style**: RESTful API (또는 GraphQL 선택 가능)

**대안 프레임워크**:
- Express.js (가볍고 유연)
- Fastify (고성능)

### Database
- **Primary DB**: PostgreSQL
- **ORM**: Prisma (추천)
  - TypeScript 네이티브
  - 자동 타입 생성
  - 직관적인 쿼리 문법
  - 마이그레이션 관리 우수
- **Cache**: Redis (선택적)

**대안 ORM**:
- TypeORM (데코레이터 기반)

### AI/ML
- **LLM 옵션**:
  - AWS Bedrock (Claude 3.5, Llama)
  - OpenAI API (GPT-4)
- **ML 옵션**:
  - AWS SageMaker (커스텀 모델)
  - 간단한 분류는 LLM으로 충분

### Infrastructure (AWS)

```
┌─────────────────────────────────────────────────────────┐
│                     사용자                               │
└────────────┬────────────────────────────┬───────────────┘
             │                            │
        ┌────▼─────┐                 ┌────▼─────┐
        │   Web    │                 │  Mobile  │
        │ (Next.js)│                 │   (RN)   │
        └────┬─────┘                 └────┬─────┘
             │                            │
        ┌────▼────────────────────────────▼─────┐
        │      CloudFront / API Gateway         │
        └────┬──────────────────────────────────┘
             │
        ┌────▼─────┐
        │   ECS    │ ◄─── Backend API (NestJS)
        │ Fargate  │
        └────┬─────┘
             │
    ┌────────┼────────┬──────────┬──────────┐
    │        │        │          │          │
┌───▼───┐ ┌─▼──┐ ┌───▼────┐ ┌───▼────┐ ┌──▼────┐
│  RDS  │ │ S3 │ │Bedrock │ │Cognito │ │Lambda │
│(Postgres)│    │ (LLM)  │ (Auth) │(Email)│
└───────┘ └────┘ └────────┘ └────────┘ └───────┘
```

**주요 AWS 서비스**:
- **Frontend Web**: Amplify / CloudFront + S3
- **Mobile App**: Expo / CodePush
- **Backend API**: ECS Fargate (또는 Lambda 서버리스)
- **Database**: RDS PostgreSQL
- **File Storage**: S3
- **AI/ML**: Bedrock / SageMaker
- **Email Integration**: Lambda + Gmail API
- **Authentication**: Cognito (또는 NextAuth.js)
- **Monitoring**: CloudWatch + Sentry
- **CI/CD**: CodePipeline / GitHub Actions

---

## 시장 조사 결과

### 글로벌 시장
**AI 자동 분류 기능을 가진 주요 가계부 앱**:
- Mint (미국) - 은행 계좌 연동 후 자동 카테고리 분류
- YNAB (You Need A Budget) - 거래 내역 자동 분류 및 학습 기능
- Quicken - 머신러닝 기반 자동 카테고리 할당
- Receiptin - AI 영수증 스캔 및 자동 분류
- Receiptix - 스마트 카테고리 자동 분류
- Ramp - 기업용, AI 기반 자동 비용 추적

**특징**: 대부분 은행 API 직접 연동 방식, 엑셀 업로드 방식은 제한적

### 한국 시장
**주요 서비스**:
- 뱅크샐러드 - 은행/카드사 계좌 연동, 자동 분류
- 토스 - 계좌 연동 기반 자동 분류
- 카카오페이 - 결제 내역 자동 추적

**시장 기회**:
- 한국 시장에서 "카드사 엑셀 파일 업로드 → AI 자동 분류" 방식의 전문 서비스는 희소
- 대부분 은행/카드사 API 직접 연동 방식
- 엑셀 업로드 방식은 틈새 시장으로 기회 존재

### 기술 트렌드
- **LLM 활용**: GPT 등을 활용한 거래 내역 분류 증가 추세
- **정확도**: AI 기반 자동 분류 정확도 95-96%
- **학습 기능**: 사용자 수정 사항을 학습하여 정확도 향상

---

## 개발 단계

### Phase 0: 기획 (현재 단계)
- [ ] 요구사항 정의
- [ ] 와이어프레임 / UI/UX 설계
- [ ] 카드사별 엑셀 포맷 조사 (주요 5개 카드사)
- [ ] 카테고리 분류 체계 설계
- [ ] 기술 스택 최종 확정
- [ ] DB 스키마 설계 (ERD 작성)

### Phase 1: MVP (최소 기능 제품)
**목표**: 핵심 기능 검증

#### 1. Backend API 개발
- 사용자 인증 (회원가입/로그인)
- 엑셀 파일 업로드 API
- 파일 파싱 로직 (다양한 카드사 포맷 지원)
- LLM 연동 (카테고리 자동 분류)
- 거래 내역 CRUD API
- 카테고리 관리 API

#### 2. Database 설계
**주요 테이블**:
- Users (사용자)
- Transactions (거래 내역)
- Categories (카테고리)
- Files (업로드 파일 메타데이터)
- CardCompanies (카드사 정보)

#### 3. Frontend Web (Next.js)
- 로그인/회원가입 페이지
- 파일 업로드 페이지
- 거래 내역 목록/상세 페이지
- 카테고리별 통계 대시보드
- 카테고리 수정 기능
- 월별/연도별 리포트

#### 4. AI 분류 엔진
- 프롬프트 엔지니어링
- LLM 연동 및 테스트
- 정확도 검증
- 사용자 피드백 반영 로직

### Phase 2: 모바일 앱
- React Native 앱 개발
- 웹과 동일한 기능 구현
- 모바일 최적화 UI/UX
- 앱 스토어 배포 준비

### Phase 3: 고도화
- Gmail API 연동 (메일 자동 수집)
- 다양한 카드사 포맷 지원 확대
- 사용자 피드백 기반 분류 학습
- 예산 관리 기능
- 지출 패턴 분석 및 인사이트
- 리포트 내보내기 (PDF, Excel)
- 다중 사용자/가족 계정

---

## 기술 스택 비교

### Backend Framework

| 항목 | NestJS | Express | Fastify |
|------|--------|---------|---------|
| TypeScript 지원 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| 구조화/모듈화 | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| 성능 | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 생태계 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 학습곡선 | 중간 | 쉬움 | 쉬움 |
| 엔터프라이즈 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |

**추천**: NestJS

### ORM

| 항목 | Prisma | TypeORM |
|------|--------|---------|
| TypeScript 지원 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 타입 안정성 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| 마이그레이션 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 성능 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| DX (개발 경험) | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| 쿼리 문법 | 직관적 | 데코레이터 기반 |

**추천**: Prisma

---

## 최종 추천 스택

```json
{
  "frontend_web": "Next.js 15+ (App Router)",
  "frontend_mobile": "React Native + Expo",
  "backend": "NestJS",
  "database": "PostgreSQL + Prisma",
  "ai": "AWS Bedrock (Claude 3.5)",
  "infrastructure": "AWS (ECS Fargate + RDS + S3)",
  "auth": "AWS Cognito",
  "storage": "S3",
  "monitoring": "CloudWatch + Sentry",
  "ci_cd": "GitHub Actions"
}
```

---

## 다음 단계 액션 아이템

### 즉시 착수 가능한 작업

1. **카드사 엑셀 포맷 조사**
   - 주요 카드사 5개 샘플 수집 (신한, 삼성, 현대, KB, 롯데 등)
   - 각 카드사별 엑셀 포맷 분석
   - 공통 필드 및 차이점 정리

2. **카테고리 체계 설계**
   - 대분류: 식비, 교통, 쇼핑, 주거, 의료, 문화, 기타
   - 중분류/소분류 정의
   - 카테고리 아이콘 및 색상 정의

3. **DB 스키마 설계**
   - ERD 작성
   - 테이블 관계 정의
   - 인덱스 전략 수립

4. **와이어프레임 작성**
   - 주요 화면 설계 (로그인, 업로드, 목록, 대시보드)
   - 사용자 플로우 정의
   - UI/UX 가이드라인

5. **개발 환경 세팅**
   - AWS 계정 생성
   - GitHub 레포지토리 생성
   - 프로젝트 구조 설계
   - 개발/스테이징/프로덕션 환경 분리

---

## 프로젝트 일정 (예상)

### Phase 0: 기획 (2주)
- 요구사항 정의 및 설계

### Phase 1: MVP (8-10주)
- Backend: 3-4주
- Frontend Web: 3-4주
- AI 엔진: 2주 (병렬 진행)
- 통합 테스트: 1주

### Phase 2: 모바일 (4-6주)
- React Native 개발: 3-4주
- 테스트 및 배포: 1-2주

### Phase 3: 고도화 (지속적)
- 기능 추가 및 개선

**총 예상 기간**: 약 4-5개월 (MVP까지)

---

## 참고 자료

### 기술 문서
- [Next.js Documentation](https://nextjs.org/docs)
- [NestJS Documentation](https://docs.nestjs.com)
- [Prisma Documentation](https://www.prisma.io/docs)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock)

### 유사 프로젝트 참고
- Mint, YNAB, Quicken (기능 참고)
- 뱅크샐러드, 토스 (한국 시장 참고)

---

## 프로젝트 상태

- **현재 단계**: Phase 0 (기획)
- **다음 단계**: 카드사 포맷 조사 및 DB 스키마 설계
- **개발 순서**: 미정 (기획 완료 후 결정)
