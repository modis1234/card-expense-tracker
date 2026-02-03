# 프로젝트 개발 규칙

## 코드 스타일

### TypeScript
- **명명 규칙**
  - 클래스/인터페이스: PascalCase (`UserService`, `CreateUserDto`)
  - 함수/변수: camelCase (`getUserById`, `userName`)
  - 상수: UPPER_SNAKE_CASE (`MAX_FILE_SIZE`, `API_VERSION`)
  - 파일명: kebab-case (`user.service.ts`, `auth.controller.ts`)

- **타입 안전성**
  - `any` 사용 금지 (불가피한 경우 `unknown` 사용)
  - 모든 함수에 반환 타입 명시
  - DTO에 class-validator 데코레이터 필수

### NestJS
- **모듈 구조**
  ```
  module/
  ├── dto/
  │   ├── create-*.dto.ts
  │   └── update-*.dto.ts
  ├── entities/
  │   └── *.entity.ts
  ├── *.controller.ts
  ├── *.service.ts
  └── *.module.ts
  ```

- **의존성 주입**
  - 생성자 주입 사용
  - `@Injectable()` 데코레이터 필수

- **에러 처리**
  - NestJS 내장 예외 사용 (`BadRequestException`, `NotFoundException` 등)
  - 커스텀 예외는 `HttpException` 상속

## Git 커밋 규칙

### 커밋 메시지 형식
```
<type>: <subject>

<body> (선택)
```

### Type
- `feat`: 새로운 기능
- `fix`: 버그 수정
- `docs`: 문서 수정
- `style`: 코드 포맷팅 (기능 변경 없음)
- `refactor`: 코드 리팩토링
- `test`: 테스트 추가/수정
- `chore`: 빌드/설정 변경

### 예시
```bash
feat: Auth 모듈 구현

- JWT 전략 추가
- 회원가입/로그인 API 구현
- Auth Guard 설정
```

## 브랜치 전략

### 브랜치 명명
- `main`: 프로덕션 배포
- `develop`: 개발 통합
- `feature/<기능명>`: 기능 개발
- `fix/<버그명>`: 버그 수정

### 예시
```bash
feature/auth-module
feature/file-parser
fix/transaction-date-parsing
```

## API 설계 규칙

### RESTful 원칙
```
GET    /users           # 목록 조회
GET    /users/:id       # 단일 조회
POST   /users           # 생성
PATCH  /users/:id       # 수정
DELETE /users/:id       # 삭제
```

### 응답 형식
```typescript
// 성공
{
  "data": { ... },
  "message": "Success"
}

// 에러
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

### 페이지네이션
```typescript
// Query
?page=1&limit=10&sort=createdAt:desc

// Response
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

## 데이터베이스 규칙

### 테이블 명명
- 소문자 + 언더스코어 (`users`, `user_feedbacks`)
- 복수형 사용

### 컬럼 명명
- camelCase (Prisma 스키마)
- snake_case (실제 DB)

### 인덱스
- 자주 조회되는 컬럼에 인덱스 추가
- 복합 인덱스 우선 고려

## 보안 규칙

### 인증/인가
- 모든 API는 기본적으로 인증 필요
- Public API는 명시적으로 `@Public()` 데코레이터 사용

### 비밀번호
- bcrypt로 해싱 (salt rounds: 10)
- 평문 비밀번호 로그 금지

### 환경 변수
- 민감 정보는 `.env`에만 저장
- `.env.example`에는 예시 값만
- `.env`는 절대 커밋 금지

### 파일 업로드
- 파일 크기 제한: 10MB
- 허용 확장자: `.xlsx`, `.xls`
- 파일명 UUID로 변경

## 테스트 규칙

### 단위 테스트
- 모든 Service에 테스트 작성
- 커버리지 80% 이상 목표

### E2E 테스트
- 주요 API 엔드포인트 테스트
- 인증 플로우 테스트

### 테스트 명명
```typescript
describe('UserService', () => {
  describe('create', () => {
    it('should create a new user', async () => {
      // ...
    });
    
    it('should throw error if email exists', async () => {
      // ...
    });
  });
});
```

## 문서화 규칙

### 코드 주석
- 복잡한 로직에만 주석 작성
- 함수명으로 의도가 명확하면 주석 불필요

### API 문서
- Swagger 데코레이터 사용
- 모든 DTO에 `@ApiProperty()` 추가

### README
- 각 모듈별 README.md 작성
- 설치/실행 방법 명시

## 성능 규칙

### 쿼리 최적화
- N+1 문제 방지 (Prisma `include` 활용)
- 필요한 필드만 SELECT
- 페이지네이션 필수

### 캐싱
- 자주 조회되는 데이터 캐싱 (카테고리 목록 등)
- Redis 사용 (Phase 5)

## 배포 규칙

### 환경 분리
- `development`: 로컬 개발
- `staging`: 테스트 서버
- `production`: 프로덕션

### CI/CD
- GitHub Actions 사용
- `main` 브랜치 푸시 시 자동 배포
- 테스트 실패 시 배포 중단

## 코드 리뷰 규칙

### PR 작성
- 제목: 커밋 메시지 형식 준수
- 설명: 변경 사항, 테스트 방법 명시
- 스크린샷 첨부 (UI 변경 시)

### 리뷰 기준
- 코드 스타일 준수
- 테스트 작성 여부
- 보안 이슈 확인
- 성능 영향 검토

## 예외 사항

### 프로토타입 단계
- 테스트 작성 선택적
- 문서화 간소화 가능

### 긴급 수정
- `hotfix/` 브랜치 사용
- 리뷰 후 즉시 배포

---

**규칙 업데이트**: 프로젝트 진행하며 필요 시 수정
