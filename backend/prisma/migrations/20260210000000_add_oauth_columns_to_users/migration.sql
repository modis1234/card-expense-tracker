-- 스키마에는 있었지만 마이그레이션에 누락된 OAuth/Gmail 컬럼 보정
-- 이미 컬럼이 있는 DB(Supabase)에서도 실패하지 않도록 IF NOT EXISTS 사용

-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "gmailAccessToken" TEXT,
ADD COLUMN IF NOT EXISTS "gmailRefreshToken" TEXT,
ADD COLUMN IF NOT EXISTS "googleId" TEXT,
ADD COLUMN IF NOT EXISTS "picture" TEXT,
ADD COLUMN IF NOT EXISTS "provider" TEXT DEFAULT 'local',
ALTER COLUMN "password" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "users_googleId_key" ON "users"("googleId");
