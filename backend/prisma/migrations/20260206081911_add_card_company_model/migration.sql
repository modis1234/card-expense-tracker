-- CreateTable
CREATE TABLE "card_companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "card_companies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "card_companies_name_key" ON "card_companies"("name");

-- CreateIndex
CREATE UNIQUE INDEX "card_companies_code_key" ON "card_companies"("code");

-- AlterTable
ALTER TABLE "files" ADD COLUMN "cardCompanyId" TEXT;
ALTER TABLE "transactions" ADD COLUMN "cardCompanyId" TEXT;

-- Update existing data (set to a default card company or handle as needed)
-- You'll need to create a default card company first or update this migration

-- Drop old columns
ALTER TABLE "files" DROP COLUMN "cardCompany";
ALTER TABLE "transactions" DROP COLUMN "cardCompany";

-- Make columns NOT NULL after data migration
ALTER TABLE "files" ALTER COLUMN "cardCompanyId" SET NOT NULL;
ALTER TABLE "transactions" ALTER COLUMN "cardCompanyId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "files_cardCompanyId_idx" ON "files"("cardCompanyId");
CREATE INDEX "transactions_cardCompanyId_idx" ON "transactions"("cardCompanyId");

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_cardCompanyId_fkey" FOREIGN KEY ("cardCompanyId") REFERENCES "card_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_cardCompanyId_fkey" FOREIGN KEY ("cardCompanyId") REFERENCES "card_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
