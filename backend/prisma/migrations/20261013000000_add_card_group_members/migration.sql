-- CreateTable
CREATE TABLE "card_group_members" (
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "card_group_members_pkey" PRIMARY KEY ("groupId","userId")
);

-- CreateIndex
CREATE INDEX "card_group_members_userId_idx" ON "card_group_members"("userId");

-- AddForeignKey
ALTER TABLE "card_group_members" ADD CONSTRAINT "card_group_members_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "card_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_group_members" ADD CONSTRAINT "card_group_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
