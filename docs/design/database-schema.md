# 데이터베이스 스키마 설계

## ERD (Entity Relationship Diagram)

```
┌─────────────────┐
│      User       │
├─────────────────┤
│ id (PK)         │──┐
│ email (UNIQUE)  │  │
│ password        │  │
│ name            │  │
│ createdAt       │  │
│ updatedAt       │  │
└─────────────────┘  │
                     │ 1:N
                     │
┌────────────────────▼──────┐
│      Transaction          │
├───────────────────────────┤
│ id (PK)                   │
│ userId (FK)               │
│ categoryId (FK)           │──┐
│ date                      │  │
│ amount                    │  │
│ merchantName              │  │
│ description               │  │
│ cardCompany               │  │
│ needsReview               │  │
│ confidence                │  │
│ fileId (FK)               │  │
│ createdAt                 │  │
│ updatedAt                 │  │
└───────────────────────────┘  │
                               │ N:1
                               │
                         ┌─────▼──────────┐
                         │    Category    │
                         ├────────────────┤
                         │ id (PK)        │
                         │ name           │
                         │ parentId (FK)  │──┐
                         │ icon           │  │
                         │ color          │  │
                         │ order          │  │
                         │ isActive       │  │
                         └────────────────┘  │
                                             │ Self Join
                                             │ (계층 구조)
                                             └──┘

┌─────────────────┐
│      File       │
├─────────────────┤
│ id (PK)         │
│ userId (FK)     │
│ filename        │
│ originalName    │
│ fileUrl         │
│ fileSize        │
│ cardCompany     │
│ uploadedAt      │
│ status          │
└─────────────────┘

┌──────────────────────┐
│    UserFeedback      │
├──────────────────────┤
│ id (PK)              │
│ userId (FK)          │
│ transactionId (FK)   │
│ oldCategoryId (FK)   │
│ newCategoryId (FK)   │
│ merchantName         │
│ createdAt            │
└──────────────────────┘
```

---

## 테이블 상세 설계

### 1. User (사용자)

**목적**: 사용자 계정 정보 관리

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | UUID | PRIMARY KEY | 사용자 고유 ID |
| email | VARCHAR(255) | UNIQUE, NOT NULL | 이메일 (로그인 ID) |
| password | VARCHAR(255) | NOT NULL | 해싱된 비밀번호 (bcrypt) |
| name | VARCHAR(100) | NULLABLE | 사용자 이름 |
| createdAt | TIMESTAMP | DEFAULT NOW() | 가입일 |
| updatedAt | TIMESTAMP | DEFAULT NOW() | 수정일 |

**인덱스**:
- PRIMARY KEY: `id`
- UNIQUE INDEX: `email`

**비즈니스 규칙**:
- 이메일 중복 불가
- 비밀번호는 bcrypt로 해싱 (최소 8자)
- 소프트 삭제 고려 (나중에 추가)

---

### 2. Category (카테고리)

**목적**: 거래 카테고리 계층 구조 관리

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | UUID | PRIMARY KEY | 카테고리 고유 ID |
| name | VARCHAR(50) | NOT NULL | 카테고리 이름 |
| parentId | UUID | FOREIGN KEY, NULLABLE | 부모 카테고리 ID (대분류는 NULL) |
| icon | VARCHAR(50) | NOT NULL | 아이콘 (emoji 또는 icon name) |
| color | VARCHAR(7) | NOT NULL | 색상 코드 (#RRGGBB) |
| order | INTEGER | NOT NULL | 정렬 순서 |
| isActive | BOOLEAN | DEFAULT TRUE | 활성화 여부 |

**인덱스**:
- PRIMARY KEY: `id`
- INDEX: `parentId` (계층 조회 최적화)
- INDEX: `isActive, order` (활성 카테고리 정렬)

**비즈니스 규칙**:
- 2단계 계층 구조 (대분류 → 중분류)
- 대분류: parentId = NULL
- 중분류: parentId = 대분류 ID
- 시스템 카테고리는 삭제 불가 (isActive = false로 비활성화)

**초기 데이터 (시드)**:
```
대분류 (9개):
1. 식비 (🍽️, #FF6B6B)
2. 배달 (🛵, #4ECDC4)
3. 교통 (🚗, #95E1D3)
4. 쇼핑 (🛍️, #F38181)
5. 주거/통신 (🏠, #AA96DA)
6. 의료/건강 (⚕️, #FCBAD3)
7. 문화/여가 (🎬, #A8D8EA)
8. 교육 (📚, #FFFFD2)
9. 기타 (📌, #C7CEEA)

중분류 (각 대분류당 3-5개)
```

---

### 3. Transaction (거래 내역)

**목적**: 카드 결제 거래 내역 저장

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | UUID | PRIMARY KEY | 거래 고유 ID |
| userId | UUID | FOREIGN KEY, NOT NULL | 사용자 ID |
| categoryId | UUID | FOREIGN KEY, NOT NULL | 카테고리 ID |
| date | DATE | NOT NULL | 거래 날짜 |
| amount | INTEGER | NOT NULL | 거래 금액 (원 단위, 양수) |
| merchantName | VARCHAR(200) | NOT NULL | 가맹점명 |
| description | TEXT | NULLABLE | 메모/설명 |
| cardCompany | VARCHAR(50) | NOT NULL | 카드사 (신한, 삼성, 현대 등) |
| needsReview | BOOLEAN | DEFAULT FALSE | 사용자 확인 필요 여부 |
| confidence | DECIMAL(3,2) | NULLABLE | AI 분류 신뢰도 (0.00~1.00) |
| fileId | UUID | FOREIGN KEY, NULLABLE | 업로드 파일 ID |
| createdAt | TIMESTAMP | DEFAULT NOW() | 생성일 |
| updatedAt | TIMESTAMP | DEFAULT NOW() | 수정일 |

**인덱스**:
- PRIMARY KEY: `id`
- INDEX: `userId, date DESC` (사용자별 날짜 조회 최적화)
- INDEX: `categoryId` (카테고리별 조회)
- INDEX: `userId, categoryId, date` (통계 쿼리 최적화)
- INDEX: `needsReview` (확인 필요 거래 조회)

**비즈니스 규칙**:
- amount는 항상 양수 (환불은 음수로 저장 가능하도록 나중에 확장)
- confidence: AI 분류 신뢰도
  - 0.80 이상: 자동 확정
  - 0.50~0.79: 확정 + needsReview = true
  - 0.50 미만: needsReview = true
- merchantName: 원본 가맹점명 저장 (정규화 안 함)

---

### 4. File (업로드 파일)

**목적**: 업로드된 엑셀 파일 메타데이터 관리

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | UUID | PRIMARY KEY | 파일 고유 ID |
| userId | UUID | FOREIGN KEY, NOT NULL | 사용자 ID |
| filename | VARCHAR(255) | NOT NULL | 저장된 파일명 (UUID) |
| originalName | VARCHAR(255) | NOT NULL | 원본 파일명 |
| fileUrl | TEXT | NOT NULL | 파일 URL (Supabase Storage) |
| fileSize | INTEGER | NOT NULL | 파일 크기 (bytes) |
| cardCompany | VARCHAR(50) | NOT NULL | 식별된 카드사 |
| uploadedAt | TIMESTAMP | DEFAULT NOW() | 업로드 일시 |
| status | VARCHAR(20) | DEFAULT 'completed' | 처리 상태 |

**인덱스**:
- PRIMARY KEY: `id`
- INDEX: `userId, uploadedAt DESC` (사용자별 업로드 이력)

**status 값**:
- `processing`: 처리 중
- `completed`: 완료
- `failed`: 실패

**비즈니스 규칙**:
- 파일은 Supabase Storage에 저장
- 파일명은 UUID로 생성 (중복 방지)
- 원본 파일명은 별도 저장 (사용자 확인용)

---

### 5. UserFeedback (사용자 피드백)

**목적**: 사용자의 카테고리 수정 이력 저장 (AI 학습용)

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | UUID | PRIMARY KEY | 피드백 고유 ID |
| userId | UUID | FOREIGN KEY, NOT NULL | 사용자 ID |
| transactionId | UUID | FOREIGN KEY, NOT NULL | 거래 ID |
| oldCategoryId | UUID | FOREIGN KEY, NOT NULL | 변경 전 카테고리 |
| newCategoryId | UUID | FOREIGN KEY, NOT NULL | 변경 후 카테고리 |
| merchantName | VARCHAR(200) | NOT NULL | 가맹점명 (스냅샷) |
| createdAt | TIMESTAMP | DEFAULT NOW() | 피드백 일시 |

**인덱스**:
- PRIMARY KEY: `id`
- INDEX: `merchantName` (가맹점별 패턴 분석)
- INDEX: `userId, createdAt DESC` (사용자별 피드백 이력)

**비즈니스 규칙**:
- 카테고리 수정 시 자동 생성
- merchantName은 스냅샷 (Transaction 삭제 시에도 유지)
- 향후 AI 재학습에 활용

---

## 관계 (Relationships)

### 1:N 관계

```
User (1) ──< Transaction (N)
- 한 사용자는 여러 거래를 가짐

User (1) ──< File (N)
- 한 사용자는 여러 파일을 업로드

Category (1) ──< Transaction (N)
- 한 카테고리는 여러 거래에 사용됨

File (1) ──< Transaction (N)
- 한 파일에서 여러 거래가 생성됨

User (1) ──< UserFeedback (N)
- 한 사용자는 여러 피드백을 남김
```

### Self Join

```
Category (1) ──< Category (N)
- 대분류는 여러 중분류를 가짐
- parentId로 계층 구조 표현
```

---

## 제약 조건 (Constraints)

### Foreign Key Constraints

```sql
-- Transaction
FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
FOREIGN KEY (categoryId) REFERENCES Category(id) ON DELETE RESTRICT
FOREIGN KEY (fileId) REFERENCES File(id) ON DELETE SET NULL

-- Category
FOREIGN KEY (parentId) REFERENCES Category(id) ON DELETE RESTRICT

-- File
FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE

-- UserFeedback
FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
FOREIGN KEY (transactionId) REFERENCES Transaction(id) ON DELETE CASCADE
FOREIGN KEY (oldCategoryId) REFERENCES Category(id) ON DELETE RESTRICT
FOREIGN KEY (newCategoryId) REFERENCES Category(id) ON DELETE RESTRICT
```

### Check Constraints

```sql
-- Transaction
CHECK (amount > 0)
CHECK (confidence >= 0 AND confidence <= 1)

-- File
CHECK (fileSize > 0)

-- Category
CHECK (order >= 0)
```

---

## Prisma 스키마

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String         @id @default(uuid())
  email        String         @unique
  password     String
  name         String?
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
  
  transactions Transaction[]
  files        File[]
  feedbacks    UserFeedback[]
  
  @@map("users")
}

model Category {
  id           String         @id @default(uuid())
  name         String
  parentId     String?
  parent       Category?      @relation("CategoryTree", fields: [parentId], references: [id], onDelete: Restrict)
  children     Category[]     @relation("CategoryTree")
  icon         String
  color        String
  order        Int
  isActive     Boolean        @default(true)
  
  transactions Transaction[]
  oldFeedbacks UserFeedback[] @relation("OldCategory")
  newFeedbacks UserFeedback[] @relation("NewCategory")
  
  @@index([parentId])
  @@index([isActive, order])
  @@map("categories")
}

model Transaction {
  id            String         @id @default(uuid())
  userId        String
  user          User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  categoryId    String
  category      Category       @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  date          DateTime       @db.Date
  amount        Int
  merchantName  String
  description   String?        @db.Text
  cardCompany   String
  needsReview   Boolean        @default(false)
  confidence    Decimal?       @db.Decimal(3, 2)
  fileId        String?
  file          File?          @relation(fields: [fileId], references: [id], onDelete: SetNull)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  
  feedbacks     UserFeedback[]
  
  @@index([userId, date(sort: Desc)])
  @@index([categoryId])
  @@index([userId, categoryId, date])
  @@index([needsReview])
  @@map("transactions")
}

model File {
  id            String         @id @default(uuid())
  userId        String
  user          User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  filename      String
  originalName  String
  fileUrl       String         @db.Text
  fileSize      Int
  cardCompany   String
  uploadedAt    DateTime       @default(now())
  status        String         @default("completed")
  
  transactions  Transaction[]
  
  @@index([userId, uploadedAt(sort: Desc)])
  @@map("files")
}

model UserFeedback {
  id              String       @id @default(uuid())
  userId          String
  user            User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactionId   String
  transaction     Transaction  @relation(fields: [transactionId], references: [id], onDelete: Cascade)
  oldCategoryId   String
  oldCategory     Category     @relation("OldCategory", fields: [oldCategoryId], references: [id], onDelete: Restrict)
  newCategoryId   String
  newCategory     Category     @relation("NewCategory", fields: [newCategoryId], references: [id], onDelete: Restrict)
  merchantName    String
  createdAt       DateTime     @default(now())
  
  @@index([merchantName])
  @@index([userId, createdAt(sort: Desc)])
  @@map("user_feedbacks")
}
```

---

## 주요 쿼리 패턴

### 1. 사용자별 월간 거래 조회
```sql
SELECT t.*, c.name as category_name, c.icon, c.color
FROM transactions t
JOIN categories c ON t.category_id = c.id
WHERE t.user_id = ?
  AND t.date >= '2024-01-01'
  AND t.date < '2024-02-01'
ORDER BY t.date DESC;
```

### 2. 카테고리별 월간 합계
```sql
SELECT 
  c.id,
  c.name,
  c.icon,
  c.color,
  SUM(t.amount) as total_amount,
  COUNT(*) as transaction_count
FROM transactions t
JOIN categories c ON t.category_id = c.id
WHERE t.user_id = ?
  AND t.date >= '2024-01-01'
  AND t.date < '2024-02-01'
GROUP BY c.id, c.name, c.icon, c.color
ORDER BY total_amount DESC;
```

### 3. 확인 필요 거래 조회
```sql
SELECT t.*, c.name as category_name
FROM transactions t
JOIN categories c ON t.category_id = c.id
WHERE t.user_id = ?
  AND t.needs_review = true
ORDER BY t.date DESC;
```

### 4. 가맹점별 피드백 패턴
```sql
SELECT 
  merchant_name,
  old_category_id,
  new_category_id,
  COUNT(*) as feedback_count
FROM user_feedbacks
WHERE merchant_name LIKE '%스타벅스%'
GROUP BY merchant_name, old_category_id, new_category_id
ORDER BY feedback_count DESC;
```

---

## 데이터 볼륨 예상

### 사용자 100명 기준 (1년)
```
Users: 100건
Categories: 50건 (시스템 카테고리)
Transactions: 60,000건 (사용자당 월 50건 × 12개월)
Files: 1,200건 (사용자당 월 1건)
UserFeedbacks: 6,000건 (거래의 10% 수정)

총 데이터: ~67,350건
예상 DB 크기: ~50MB
```

### 사용자 10,000명 기준 (1년)
```
Users: 10,000건
Transactions: 6,000,000건
Files: 120,000건
UserFeedbacks: 600,000건

총 데이터: ~6,730,000건
예상 DB 크기: ~5GB
```

---

## 성능 최적화 전략

### 1. 인덱스 전략
- 자주 조회되는 컬럼에 인덱스 생성
- 복합 인덱스로 쿼리 최적화
- 정기적인 인덱스 재구성

### 2. 파티셔닝 (나중에)
- Transaction 테이블을 날짜별로 파티셔닝
- 오래된 데이터는 아카이빙

### 3. 캐싱
- 카테고리 목록 (자주 변경 안 됨)
- 월간 통계 (일정 시간 캐싱)

### 4. 쿼리 최적화
- N+1 문제 방지 (Prisma include 활용)
- 필요한 컬럼만 SELECT
- 페이지네이션 적용

---

## 마이그레이션 전략

### 초기 마이그레이션
```bash
# 1. Prisma 스키마 작성
# 2. 마이그레이션 생성
npx prisma migrate dev --name init

# 3. 시드 데이터 실행
npx prisma db seed
```

### 시드 데이터 (prisma/seed.ts)
```typescript
// 카테고리 초기 데이터
// - 대분류 9개
// - 중분류 각 3-5개
// - 아이콘, 색상, 순서 설정
```

---

## 다음 단계

1. ✅ ERD 설계 완료
2. [ ] 카테고리 시드 데이터 작성
3. [ ] Prisma 스키마 검증
4. [ ] 마이그레이션 테스트

ERD 설계가 완료되었습니다. 다음으로 **카테고리 시드 데이터**를 작성할까요?
