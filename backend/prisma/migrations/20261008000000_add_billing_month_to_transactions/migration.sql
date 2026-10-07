-- AlterTable: 청구월 'YYYY-MM' (할부 회차를 이용일이 아닌 청구된 달 지출로 집계)
ALTER TABLE "transactions" ADD COLUMN     "billingMonth" TEXT;

-- 기존 하나카드 업로드분: 명세서 이용기간 종료월 = 파일 내 가장 늦은 이용일의 달
UPDATE "transactions" t
SET "billingMonth" = f."lastMonth"
FROM (
    SELECT t2."fileId", to_char(max(t2."date"), 'YYYY-MM') AS "lastMonth"
    FROM "transactions" t2
    JOIN "files" fi ON fi."id" = t2."fileId"
    JOIN "card_companies" cc ON cc."id" = fi."cardCompanyId"
    WHERE cc."code" = 'HANA'
    GROUP BY t2."fileId"
) f
WHERE t."fileId" = f."fileId";
