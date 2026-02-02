# 아키텍처 의사결정 기록 (ADR)

## 개요
이 문서는 프로젝트의 주요 기술적 의사결정과 그 이유를 기록합니다.

---

## ADR-001: Backend 프레임워크 선택 (NestJS)

### 결정 사항
NestJS를 Backend 프레임워크로 선택

### 상황
- 엑셀 파싱, AI 분류 등 복잡한 비즈니스 로직 필요
- 확장 가능한 아키텍처 필요
- TypeScript 기반 개발 선호

### 고려한 대안
1. **Supabase만 사용** (Backend-as-a-Service)
   - 장점: 빠른 개발, 무료
   - 단점: 복잡한 로직 처리 제한적

2. **Express.js**
   - 장점: 가볍고 유연
   - 단점: 구조화 부족, 확장성 낮음

3. **NestJS** ✅
   - 장점: 엔터프라이즈급 구조, TypeScript 네이티브, 확장성
   - 단점: 학습 곡선

### 결정 이유
1. 복잡한 비즈니스 로직 (엑셀 파싱, AI 분류)
2. 서버 사이드 검증 및 보안 필요
3. 확장 가능한 모듈 구조
4. 풀스택 개발 경험 및 포트폴리오 가치
5. 실무 표준 아키텍처

### 결과
- 개발 시간: 2-3주 추가
- 비용: Railway 무료 티어 활용
- 유지보수성: 높음
- 확장성: 높음

---

## ADR-002: Database 선택 (Supabase PostgreSQL)

### 결정 사항
Supabase의 PostgreSQL을 Database로 선택

### 상황
- 거래 내역, 카테고리, 사용자 간 관계형 데이터
- 복잡한 통계 쿼리 필요 (GROUP BY, JOIN)
- 무료 또는 저비용 솔루션 필요

### 고려한 대안
1. **Firebase Firestore**
   - 장점: 쉬운 개발, 실시간 동기화
   - 단점: NoSQL, 복잡한 쿼리 제한적, 집계 함수 약함

2. **AWS RDS**
   - 장점: 완전한 제어권, 성능
   - 단점: 비용 높음 ($15-25/월), 관리 복잡

3. **Supabase PostgreSQL** ✅
   - 장점: 관계형, 무료 500MB, Prisma 호환, 확장 쉬움
   - 단점: 제한된 리소스 (무료 티어)

### 결정 이유
1. 관계형 데이터 구조에 최적
2. 복잡한 통계 쿼리 가능 (SQL)
3. 무료 티어 충분 (500MB)
4. Prisma ORM과 완벽 호환
5. 나중에 AWS RDS로 마이그레이션 쉬움

### 결과
- 비용: $0 (무료 티어)
- 쿼리 성능: 우수
- 확장성: 중간 (나중에 마이그레이션 가능)

---

## ADR-003: Frontend 프레임워크 (Next.js)

### 결정 사항
Next.js를 Frontend 프레임워크로 선택 (Backend 있어도)

### 상황
- 별도 Backend API 존재
- SEO는 중요하지 않음 (가계부 앱)
- 빠른 개발 및 배포 필요

### 고려한 대안
1. **React (Vite)**
   - 장점: 단순함, 빠른 개발
   - 단점: 수동 설정 많음, 최적화 직접 구현

2. **Next.js** ✅
   - 장점: Vercel 무료 배포, 자동 최적화, 파일 기반 라우팅
   - 단점: 약간의 오버헤드

### 결정 이유
1. Vercel 무료 배포 및 최적화
2. 파일 기반 라우팅 (편의성)
3. 자동 코드 스플리팅
4. 이미지 최적화
5. 산업 표준 (포트폴리오)
6. 나중에 SSR 필요 시 쉽게 전환

### 오버엔지니어링 아닌 이유
- 복잡한 비즈니스 로직 존재
- 확장 계획 명확
- 표준적인 아키텍처
- 각 레이어의 역할 명확 (Frontend ↔ Backend 분리)

### 결과
- 개발 속도: 빠름
- 배포: 자동화 (Vercel)
- 비용: $0

---

## ADR-004: AI 서비스 선택 (OpenAI → Bedrock)

### 결정 사항
초기에는 OpenAI API, 성장 후 AWS Bedrock 전환

### 상황
- 거래 내역 자동 카테고리 분류 필요
- 초기 비용 최소화
- 확장 가능성 고려

### 고려한 대안
1. **OpenAI API** ✅ (초기)
   - 장점: $5 크레딧, 빠른 시작, 성능 우수
   - 단점: 사용량 증가 시 비용 상승

2. **AWS Bedrock** (성장 후)
   - 장점: Claude 3.5, AWS 통합, 비용 효율적 (대규모)
   - 단점: 초기 설정 복잡

3. **커스텀 ML 모델**
   - 장점: 비용 절감 (장기)
   - 단점: 개발 시간 오래 걸림, 정확도 낮을 수 있음

### 결정 이유
1. 초기: OpenAI로 빠르게 검증
2. 성장 후: Bedrock으로 비용 최적화
3. 단계적 접근으로 리스크 최소화

### 결과
- 초기 비용: $5-10/월
- 개발 속도: 빠름
- 정확도: 높음 (GPT-4)

---

## ADR-005: 배포 전략

### 결정 사항
- Frontend: Vercel
- Backend: Railway
- Database: Supabase

### 상황
- 무료 또는 저비용 배포 필요
- 자동 배포 및 CI/CD
- 확장 가능성

### 고려한 대안
1. **AWS 풀스택**
   - 장점: 완전한 제어권, 확장성
   - 단점: 비용 높음 ($50-100/월), 설정 복잡

2. **Vercel + Railway + Supabase** ✅
   - 장점: 무료 티어, 자동 배포, 간단한 설정
   - 단점: 제한된 리소스

### 결정 이유
1. 무료 티어로 시작 가능
2. Git push → 자동 배포
3. 간단한 설정
4. 나중에 AWS로 마이그레이션 가능

### 결과
- 초기 비용: $5-10/월
- 배포 시간: 5분
- 관리 복잡도: 낮음

---

## ADR-006: ORM 선택 (Prisma)

### 결정 사항
Prisma를 ORM으로 선택

### 상황
- TypeScript 프로젝트
- PostgreSQL 사용
- 타입 안정성 중요

### 고려한 대안
1. **TypeORM**
   - 장점: 성숙한 생태계
   - 단점: 데코레이터 기반, 타입 안정성 낮음

2. **Prisma** ✅
   - 장점: TypeScript 네이티브, 자동 타입 생성, 직관적
   - 단점: 상대적으로 새로움

### 결정 이유
1. TypeScript 완벽 지원
2. 자동 타입 생성
3. 직관적인 쿼리 문법
4. 마이그레이션 관리 우수
5. NestJS와 궁합 좋음

### 결과
- 개발 속도: 빠름
- 타입 안정성: 높음
- 유지보수성: 높음

---

## 기술 스택 변경 타임라인

### 2026-01-29: 초기 계획
```
Frontend: Next.js
Backend: NestJS
Database: AWS RDS
Infrastructure: AWS (ECS, S3, Bedrock)
```

### 2026-01-30: 1차 수정 (비용 고려)
```
Frontend: Next.js
Backend: Supabase (BaaS)
Database: Supabase
Infrastructure: Vercel + Supabase
```

### 2026-01-30: 최종 확정
```
Frontend: Next.js + Vercel
Backend: NestJS + Railway
Database: Supabase PostgreSQL + Prisma
AI: OpenAI → Bedrock (나중에)
```

### 최종 결정 이유
1. 복잡한 로직 서버 처리 필요
2. 확장성 및 유지보수성
3. 풀스택 개발 경험
4. 포트폴리오 가치
5. 무료 티어로 시작 가능
6. 실무 표준 아키텍처

---

## 향후 고려사항

### 성능 최적화
- Redis 캐싱 (필요 시)
- CDN 활용
- DB 인덱싱 최적화

### 확장 계획
- AWS 마이그레이션 (사용자 증가 시)
- 마이크로서비스 분리 (필요 시)
- 메시지 큐 도입 (대량 처리 시)

### 모니터링
- Sentry (에러 추적)
- CloudWatch (AWS 전환 시)
- 성능 모니터링 도구

---

## 참고 자료
- [NestJS Documentation](https://docs.nestjs.com)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Railway Documentation](https://docs.railway.app)
