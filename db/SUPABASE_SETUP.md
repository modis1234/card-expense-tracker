# Supabase PostgreSQL 연동 가이드

## 1. Supabase 프로젝트 생성

1. https://supabase.com 접속
2. "New Project" 클릭
3. 프로젝트 정보 입력:
   - Name: `card-expense-tracker`
   - Database Password: 안전한 비밀번호 생성 (저장 필수!)
   - Region: `Northeast Asia (Seoul)` 선택
4. "Create new project" 클릭 (약 2분 소요)

## 2. 데이터베이스 테이블 생성

### 방법 1: SQL Editor 사용 (추천)

1. Supabase Dashboard → 좌측 메뉴 "SQL Editor" 클릭
2. "New query" 클릭
3. `database-setup.sql` 파일 내용 복사 → 붙여넣기
4. "Run" 버튼 클릭
5. 성공 메시지 확인

### 방법 2: psql CLI 사용

```bash
# Connection string은 Supabase Dashboard → Settings → Database에서 확인
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# SQL 파일 실행
\i database-setup.sql
```

## 3. 시드 데이터 삽입

1. SQL Editor에서 새 쿼리 생성
2. `database-seed.sql` 파일 내용 복사 → 붙여넣기
3. "Run" 버튼 클릭
4. 카테고리 데이터 삽입 확인

## 4. 연결 정보 확인

Supabase Dashboard → Settings → Database에서 다음 정보 확인:

```
Host: [YOUR-PROJECT-REF].supabase.co
Database name: postgres
Port: 5432
User: postgres
Password: [YOUR-PASSWORD]
```

### Connection String (Prisma용)

```
postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres
```

## 5. 환경 변수 설정

백엔드 프로젝트에 `.env` 파일 생성:

```env
# Database
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Supabase
SUPABASE_URL="https://[YOUR-PROJECT-REF].supabase.co"
SUPABASE_ANON_KEY="[YOUR-ANON-KEY]"
SUPABASE_SERVICE_KEY="[YOUR-SERVICE-KEY]"
```

**주의**: `.env` 파일은 절대 Git에 커밋하지 마세요!

## 6. 테이블 확인

SQL Editor에서 다음 쿼리 실행:

```sql
-- 모든 테이블 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- 카테고리 데이터 확인
SELECT * FROM categories WHERE parent_id IS NULL ORDER BY "order";

-- 중분류 확인
SELECT c1.name as parent, c2.name as child
FROM categories c1
JOIN categories c2 ON c2.parent_id = c1.id
ORDER BY c1."order", c2."order";
```

## 7. Row Level Security (RLS) 설정 (선택)

보안을 위해 RLS 활성화:

```sql
-- Users 테이블 RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

-- Transactions 테이블 RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions" ON transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions" ON transactions
  FOR DELETE USING (auth.uid() = user_id);
```

## 8. 다음 단계

- [ ] Backend 프로젝트에서 Prisma 설정
- [ ] API 엔드포인트 개발
- [ ] 파일 업로드 (Supabase Storage) 설정

## 생성된 테이블 목록

✅ users
✅ categories (대분류 9개 + 중분류 30개)
✅ files
✅ transactions
✅ user_feedbacks

## 참고 자료

- [Supabase 공식 문서](https://supabase.com/docs)
- [PostgreSQL 문서](https://www.postgresql.org/docs/)
- [Prisma + Supabase 가이드](https://www.prisma.io/docs/guides/database/supabase)
