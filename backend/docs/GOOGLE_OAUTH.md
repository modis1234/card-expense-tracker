# Google OAuth SSO 가이드

## 목차
1. [빠른 시작](#빠른-시작)
2. [구현 파일 목록](#구현-파일-목록)
3. [코드 동작 원리](#코드-동작-원리)
4. [API 사용법](#api-사용법)
5. [문제 해결](#문제-해결)

---

## 빠른 시작

### 1. Google Cloud Console 설정

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 생성 또는 선택
3. **OAuth 동의 화면 구성**
   - "API 및 서비스" > "OAuth 동의 화면"
   - User Type 선택 (내부/외부)
   - 앱 정보 입력
   - 범위 추가: `userinfo.email`, `userinfo.profile`

4. **OAuth 클라이언트 ID 생성**
   - "API 및 서비스" > "사용자 인증 정보"
   - "OAuth 클라이언트 ID 만들기"
   - 애플리케이션 유형: 웹 애플리케이션
   - 승인된 리디렉션 URI 추가:
     ```
     http://localhost:3000/auth/google/callback
     ```
   - 클라이언트 ID와 클라이언트 보안 비밀번호 복사

### 2. 환경 변수 설정

`.env` 파일에 추가:

```env
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:3000/auth/google/callback"
```

### 3. 테스트

```bash
npm run start:dev
```

브라우저에서 접속:
```
http://localhost:3000/auth/google
```

---

## 구현 파일 목록

### 생성된 파일 (6개)

```
src/auth/
├── auth.module.ts              # Auth 모듈 설정
├── auth.service.ts             # Google 로그인 비즈니스 로직
├── auth.controller.ts          # OAuth 엔드포인트
├── strategies/
│   ├── google.strategy.ts      # Google OAuth 인증 전략
│   └── jwt.strategy.ts         # JWT 토큰 검증 전략
└── guards/
    └── jwt-auth.guard.ts       # JWT 인증 가드
```

#### 각 파일의 역할

**1. auth.module.ts**
- Auth 관련 모든 컴포넌트 등록
- JwtModule 설정 (secret, expiresIn)
- GoogleStrategy, JwtStrategy 등록

**2. auth.service.ts**
- Google 로그인 비즈니스 로직
- 기존 사용자 확인 또는 신규 생성
- JWT 토큰 생성 및 반환

**3. auth.controller.ts**
- `GET /auth/google` - Google 로그인 시작
- `GET /auth/google/callback` - Google 콜백 처리

**4. google.strategy.ts**
- Passport Google OAuth 전략
- Google OAuth 설정 및 사용자 정보 추출

**5. jwt.strategy.ts**
- JWT 토큰 검증 전략
- Bearer 토큰에서 JWT 추출 및 검증

**6. jwt-auth.guard.ts**
- 보호된 라우트에 사용하는 가드
- 사용법: `@UseGuards(JwtAuthGuard)`

### 수정된 파일 (4개)

**1. src/users/users.service.ts**
- `findByGoogleId()` - Google ID로 사용자 조회
- `findByEmail()` - 이메일로 사용자 조회
- `updateGoogleId()` - Google ID 업데이트
- `createGoogleUser()` - Google 사용자 생성

**2. src/users/entities/user.entity.ts**
- `googleId` 필드 추가
- `picture` 필드 추가
- `provider` 필드 추가
- `password`를 nullable로 변경

**3. src/app.module.ts**
- `AuthModule` import 추가

**4. prisma/schema.prisma**
```prisma
model User {
  id           String         @id @default(uuid())
  email        String         @unique
  password     String?        # nullable로 변경
  name         String?
  googleId     String?        @unique  # 추가
  picture      String?                 # 추가
  provider     String         @default("local")  # 추가
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
  
  transactions Transaction[]
  files        File[]
  feedbacks    UserFeedback[]
  
  @@map("users")
}
```

---

## 코드 동작 원리

### Google Strategy 상세 설명

#### 핵심 개념

**PassportStrategy란?**
- Passport는 Node.js의 인증 라이브러리
- `PassportStrategy`는 NestJS에서 Passport를 사용할 수 있게 해주는 래퍼
- `PassportStrategy(Strategy, 'google')`: Google OAuth 전략을 'google'이라는 이름으로 등록

#### 코드 구조

```typescript
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private configService: ConfigService) {
    super({
      clientID: '...',        // Google에서 발급받은 앱 ID
      clientSecret: '...',    // Google에서 발급받은 비밀키
      callbackURL: '...',     // 로그인 후 돌아올 URL
      scope: ['email', 'profile'],  // 요청할 정보 범위
    });
  }

  async validate(accessToken, refreshToken, profile, done) {
    // Google 프로필 정보를 우리 형식으로 변환
    const user = {
      googleId: profile.id,
      email: profile.emails[0].value,
      name: `${profile.name.givenName} ${profile.name.familyName}`,
      picture: profile.photos[0].value,
      accessToken,
    };
    
    // req.user에 저장
    done(null, user);
  }
}
```

#### validate() 메서드 파라미터

- **accessToken**: Google API를 호출할 수 있는 토큰
- **refreshToken**: accessToken 갱신용 토큰
- **profile**: Google에서 받아온 사용자 정보
  ```javascript
  {
    id: '1234567890',
    displayName: 'John Doe',
    name: { givenName: 'John', familyName: 'Doe' },
    emails: [{ value: 'john@gmail.com', verified: true }],
    photos: [{ value: 'https://lh3.googleusercontent.com/...' }]
  }
  ```
- **done**: Passport에게 결과를 전달하는 콜백 함수
  - `done(null, user)`: 성공, user를 req.user에 저장
  - `done(error, null)`: 실패, 에러 전달

### 전체 인증 흐름

```
1. 사용자 클릭
   브라우저 → http://localhost:3000/auth/google

2. Google 로그인 페이지로 리디렉션
   GoogleStrategy 설정 사용
   → https://accounts.google.com/o/oauth2/v2/auth?client_id=...

3. 사용자가 Google에서 로그인
   - Google 계정 선택
   - 비밀번호 입력
   - 권한 승인 (이메일, 프로필 정보 제공 동의)

4. Google이 콜백 URL로 리디렉션
   Google → http://localhost:3000/auth/google/callback?code=xxx

5. Passport가 자동으로 처리
   - code → accessToken 교환
   - accessToken → 사용자 프로필 정보 요청
   - validate() 메서드 호출

6. validate() 실행
   - Google 프로필을 우리 형식으로 변환
   - done(null, user) 호출
   - req.user에 저장

7. 컨트롤러로 전달
   @Get('google/callback')
   @UseGuards(AuthGuard('google'))
   async googleAuthRedirect(@Req() req: any) {
     // req.user에 validate()에서 반환한 user 객체가 있음
     return this.authService.googleLogin(req);
   }

8. 서비스에서 처리
   - 데이터베이스에 사용자 저장 또는 조회
   - JWT 토큰 생성
   - 클라이언트에 반환
```

### 왜 이렇게 복잡한가?

**OAuth 2.0 프로토콜 때문**
- **보안**: 사용자의 Google 비밀번호를 우리 서버가 알 수 없음
- **권한 제어**: 사용자가 명시적으로 정보 제공에 동의
- **표준화**: 모든 OAuth 제공자가 같은 방식 사용

**Passport가 해주는 일**
- OAuth 프로토콜의 복잡한 과정을 자동 처리
- code → accessToken 교환
- accessToken → 사용자 정보 요청
- 우리는 validate()만 구현하면 됨

---

## API 사용법

### 로그인 엔드포인트

```
GET /auth/google
```
→ Google 로그인 페이지로 리디렉션

```
GET /auth/google/callback
```
→ Google 인증 후 자동 호출

**응답:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@gmail.com",
    "name": "John Doe",
    "picture": "https://lh3.googleusercontent.com/..."
  }
}
```

### 보호된 라우트 생성

```typescript
import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Controller('api')
export class ApiController {
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@Request() req) {
    return {
      userId: req.user.userId,
      email: req.user.email
    };
  }
}
```

### 프론트엔드 통합

```javascript
// 로그인
window.location.href = 'http://localhost:3000/auth/google';

// 인증된 API 호출
const response = await fetch('http://localhost:3000/api/profile', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

---

## 문제 해결

### redirect_uri_mismatch
**원인**: Google Cloud Console의 리디렉션 URI와 `.env`의 URL이 불일치

**해결**:
- Google Cloud Console에서 정확히 `http://localhost:3000/auth/google/callback` 등록
- `.env`의 `GOOGLE_CALLBACK_URL`과 일치하는지 확인

### CORS 오류 (Swagger UI)
**원인**: Swagger UI에서 OAuth 리디렉션 테스트 불가

**해결**:
- 정상적인 동작입니다
- 브라우저 주소창에 직접 `http://localhost:3000/auth/google` 입력

### "No user from google"
**원인**: Google OAuth 설정 오류

**해결**:
- 환경 변수 확인 (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
- Google Cloud Console에서 OAuth 동의 화면 설정 확인
- scope에 email, profile 포함 확인

### Prisma 타입 오류
**원인**: Prisma 클라이언트가 스키마 변경을 인식하지 못함

**해결**:
```bash
npx prisma generate
npm run start:dev
```

---

## 프로덕션 배포

### 1. HTTPS 사용 필수
```typescript
// main.ts
const app = await NestFactory.create(AppModule, {
  httpsOptions: {
    key: fs.readFileSync('./secrets/private-key.pem'),
    cert: fs.readFileSync('./secrets/public-certificate.pem'),
  },
});
```

### 2. Google Cloud Console 설정
- 프로덕션 URL 추가
- 예: `https://api.yourdomain.com/auth/google/callback`

### 3. 환경 변수 업데이트
```env
GOOGLE_CALLBACK_URL="https://api.yourdomain.com/auth/google/callback"
```

### 4. CORS 설정
```typescript
app.enableCors({
  origin: ['https://yourdomain.com'],
  credentials: true,
});
```

---

## 요약

**구현 완료:**
- ✅ Google OAuth 2.0 인증
- ✅ JWT 토큰 기반 인증
- ✅ 사용자 자동 생성 및 연동
- ✅ 프로필 사진 저장

**생성 파일**: 6개
**수정 파일**: 4개
**데이터베이스**: User 테이블에 3개 컬럼 추가

**테스트**: `http://localhost:3000/auth/google`
