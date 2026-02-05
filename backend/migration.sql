-- Step 1: Create card_companies table
CREATE TABLE IF NOT EXISTS "card_companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "card_companies_pkey" PRIMARY KEY ("id")
);

-- Step 2: Create unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS "card_companies_name_key" ON "card_companies"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "card_companies_code_key" ON "card_companies"("code");

-- Step 3: Insert default card companies
INSERT INTO "card_companies" ("id", "name", "code", "isActive", "createdAt", "updatedAt")
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Unknown', 'UNKNOWN', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-0000-0000-000000000002', '현대카드', 'HYUNDAI', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- Step 3.5: Add Google OAuth fields to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "googleId" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "picture" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "provider" TEXT DEFAULT 'local';
ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL;

-- Create unique index for googleId
CREATE UNIQUE INDEX IF NOT EXISTS "users_googleId_key" ON "users"("googleId");

-- Step 4: Add new columns to files table
ALTER TABLE "files" ADD COLUMN IF NOT EXISTS "cardCompanyId" TEXT;

-- Step 5: Migrate existing files data
UPDATE "files" 
SET "cardCompanyId" = '00000000-0000-0000-0000-000000000001'
WHERE "cardCompanyId" IS NULL;

-- Step 6: Make files.cardCompanyId NOT NULL
ALTER TABLE "files" ALTER COLUMN "cardCompanyId" SET NOT NULL;

-- Step 7: Drop old files.cardCompany column
ALTER TABLE "files" DROP COLUMN IF EXISTS "cardCompany";

-- Step 8: Add new columns to transactions table
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "cardCompanyId" TEXT;

-- Step 9: Migrate existing transactions data
UPDATE "transactions" 
SET "cardCompanyId" = '00000000-0000-0000-0000-000000000001'
WHERE "cardCompanyId" IS NULL;

-- Step 10: Make transactions.cardCompanyId NOT NULL
ALTER TABLE "transactions" ALTER COLUMN "cardCompanyId" SET NOT NULL;

-- Step 11: Drop old transactions.cardCompany column
ALTER TABLE "transactions" DROP COLUMN IF EXISTS "cardCompany";

-- Step 12: Create indexes
CREATE INDEX IF NOT EXISTS "files_cardCompanyId_idx" ON "files"("cardCompanyId");
CREATE INDEX IF NOT EXISTS "transactions_cardCompanyId_idx" ON "transactions"("cardCompanyId");

-- Step 13: Add foreign key constraints
ALTER TABLE "files" 
ADD CONSTRAINT "files_cardCompanyId_fkey" 
FOREIGN KEY ("cardCompanyId") REFERENCES "card_companies"("id") 
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "transactions" 
ADD CONSTRAINT "transactions_cardCompanyId_fkey" 
FOREIGN KEY ("cardCompanyId") REFERENCES "card_companies"("id") 
ON DELETE RESTRICT ON UPDATE CASCADE;

