# Gmail API 연동 및 암호화 파일 처리 계획

## 개요

카드사에서 매월 발송하는 이메일 명세서를 자동으로 수집하고 파싱하는 기능을 추가합니다.

## Gmail API 연동

### 1. OAuth 2.0 인증

**필요한 작업:**
- Google Cloud Console에서 프로젝트 생성
- Gmail API 활성화
- OAuth 2.0 클라이언트 ID 생성
- Redirect URI 설정

**구현:**
```typescript
// src/gmail/gmail.service.ts
@Injectable()
export class GmailService {
  private oauth2Client: OAuth2Client;
  
  async authenticate(userId: string): Promise<string> {
    // OAuth URL 생성 및 반환
  }
  
  async handleCallback(code: string, userId: string): Promise<void> {
    // Access token 및 Refresh token 저장
  }
}
```

### 2. 이메일 수집

**카드사 발신자 필터링:**
```typescript
const CARD_COMPANY_SENDERS = {
  hana: '@hanacard.co.kr',
  hyundai: '@hyundaicard.com',
  shinhan: '@shinhancard.com',
  samsung: '@samsungcard.com',
  kb: '@kbcard.com',
  lotte: '@lottecard.co.kr',
};
```

**이메일 검색:**
```typescript
async fetchCardEmails(userId: string): Promise<Email[]> {
  const query = `from:(${Object.values(CARD_COMPANY_SENDERS).join(' OR ')}) 
                 subject:(이용대금명세서 OR 카드이용내역)
                 has:attachment`;
  
  // Gmail API로 이메일 검색
}
```

### 3. 첨부파일 처리

**첨부파일 다운로드:**
```typescript
async downloadAttachment(
  messageId: string, 
  attachmentId: string
): Promise<Buffer> {
  // Gmail API로 첨부파일 다운로드
}
```

**HTML 본문 파싱:**
```typescript
async parseEmailBody(messageId: string): Promise<Transaction[]> {
  const html = await this.getEmailBody(messageId);
  const parser = this.parserFactory.getHtmlParser(html);
  return parser.parse(html);
}
```

## 암호화된 엑셀 파일 처리

### 1. 라이브러리 선택

**옵션 1: msoffcrypto-tool (Python)**
- 장점: 안정적, 다양한 암호화 방식 지원
- 단점: Python 의존성

**옵션 2: node-office-crypto (Node.js)**
- 장점: Node.js 네이티브
- 단점: 제한적인 암호화 방식 지원

**선택: msoffcrypto-tool**
- Docker 환경에서 Python 설치
- Child process로 실행

### 2. 비밀번호 처리 전략

**우선순위:**
1. 사용자 입력 비밀번호
2. 생년월일 (YYMMDD, YYYYMMDD)
3. 주민등록번호 앞자리 (YYMMDD)

**구현:**
```typescript
async decryptExcel(
  filePath: string, 
  password?: string
): Promise<string> {
  const passwords = password 
    ? [password] 
    : this.generatePasswordCandidates(user.birthDate);
  
  for (const pwd of passwords) {
    try {
      return await this.tryDecrypt(filePath, pwd);
    } catch (error) {
      continue;
    }
  }
  
  throw new Error('Failed to decrypt file');
}

private generatePasswordCandidates(birthDate: Date): string[] {
  const yymmdd = format(birthDate, 'yyMMdd');
  const yyyymmdd = format(birthDate, 'yyyyMMdd');
  return [yymmdd, yyyymmdd];
}
```

### 3. 보안 고려사항

**비밀번호 처리:**
- 메모리에서만 처리, 저장 금지
- 로그에 비밀번호 출력 금지
- 복호화 후 임시 파일 즉시 삭제

**임시 파일 관리:**
```typescript
async processEncryptedFile(file: Express.Multer.File): Promise<void> {
  const tempPath = `/tmp/${uuid()}.xlsx`;
  
  try {
    await this.decryptExcel(file.path, password);
    await this.parseExcel(tempPath);
  } finally {
    // 임시 파일 삭제
    await fs.unlink(tempPath);
    await fs.unlink(file.path);
  }
}
```

## API 설계

### 1. Gmail 연동 API

```typescript
// OAuth 인증 시작
POST /gmail/auth
Response: { authUrl: string }

// OAuth 콜백
GET /gmail/callback?code=xxx
Response: { success: true }

// 이메일 동기화
POST /gmail/sync
Response: { 
  synced: 10, 
  transactions: 150 
}

// 연동 해제
DELETE /gmail/disconnect
Response: { success: true }
```

### 2. 암호화 파일 업로드 API

```typescript
// 암호화된 파일 업로드
POST /files/upload
Body: {
  file: File,
  password?: string,
  autoTryBirthDate?: boolean
}
Response: {
  success: true,
  transactions: 50,
  decryptionMethod: 'user_password' | 'birth_date'
}
```

## 데이터베이스 스키마 추가

### GmailConnection 테이블

```prisma
model GmailConnection {
  id              String    @id @default(uuid())
  userId          String    @unique
  user            User      @relation(fields: [userId], references: [id])
  accessToken     String    @db.Text  // 암호화 저장
  refreshToken    String    @db.Text  // 암호화 저장
  tokenExpiry     DateTime
  lastSyncAt      DateTime?
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@map("gmail_connections")
}
```

### File 테이블 수정

```prisma
model File {
  // ... 기존 필드
  isEncrypted     Boolean   @default(false)
  decryptionMethod String?  // 'user_password' | 'birth_date'
  source          String    @default("upload")  // 'upload' | 'gmail'
  emailMessageId  String?   // Gmail message ID
}
```

## 구현 순서

### Phase 1: 암호화 파일 처리 (우선)
1. msoffcrypto-tool 설치 및 테스트
2. 비밀번호 시도 로직 구현
3. 파일 업로드 API 수정
4. 프론트엔드 비밀번호 입력 UI

### Phase 2: Gmail API 연동
1. Google Cloud 프로젝트 설정
2. OAuth 인증 플로우 구현
3. 이메일 수집 로직 구현
4. 자동 동기화 스케줄러
5. 프론트엔드 Gmail 연동 UI

## 테스트 계획

### 암호화 파일 테스트
- [ ] 비밀번호 입력으로 복호화
- [ ] 생년월일로 자동 복호화
- [ ] 잘못된 비밀번호 처리
- [ ] 임시 파일 삭제 확인

### Gmail API 테스트
- [ ] OAuth 인증 플로우
- [ ] 이메일 검색 및 필터링
- [ ] 첨부파일 다운로드
- [ ] HTML 본문 파싱
- [ ] 토큰 갱신

## 보안 체크리스트

- [ ] OAuth 토큰 암호화 저장
- [ ] 비밀번호 메모리에서만 처리
- [ ] 임시 파일 자동 삭제
- [ ] 이메일 내용 로그 금지
- [ ] Rate limiting 적용
- [ ] 사용자별 Gmail 연동 제한

## 참고 문서

- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [msoffcrypto-tool](https://github.com/nolze/msoffcrypto-tool)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)

---

**작성일**: 2026-02-03  
**상태**: 계획 단계  
**예상 구현 시기**: Phase 5 (고도화)
