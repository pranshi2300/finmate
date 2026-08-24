-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "groupExpenseId" TEXT;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_groupExpenseId_fkey" FOREIGN KEY ("groupExpenseId") REFERENCES "group_expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
