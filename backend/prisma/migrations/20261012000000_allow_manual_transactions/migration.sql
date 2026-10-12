-- AlterTable: 직접 입력한 거래(관리비·대출이자 등)는 카드사 없이 저장
ALTER TABLE "transactions" ALTER COLUMN "cardCompanyId" DROP NOT NULL;
