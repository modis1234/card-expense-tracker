-- AlterTable: 할부 정보 (일시불이면 NULL)
ALTER TABLE "transactions" ADD COLUMN     "installmentMonths" INTEGER,
ADD COLUMN     "installmentRound" INTEGER,
ADD COLUMN     "originalAmount" INTEGER;

-- 하나카드 HTML 업로드분은 description('할부 6개월 5회차 · 이용금액 373,180원')에서 값 복원
UPDATE "transactions"
SET "installmentMonths" = substring("description" from '할부 (\d+)개월')::int,
    "installmentRound"  = substring("description" from '(\d+)회차')::int,
    "originalAmount"    = replace(substring("description" from '이용금액 (-?[0-9,]+)원'), ',', '')::int
WHERE "description" ~ '할부 \d+개월|이용금액 -?[0-9,]+원';
