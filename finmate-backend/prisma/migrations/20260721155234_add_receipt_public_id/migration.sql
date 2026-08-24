-- AlterTable
ALTER TABLE "receipts" ADD COLUMN     "publicId" TEXT;

-- RenameIndex
ALTER INDEX "transactions_receiptId_unique" RENAME TO "transactions_receiptId_key";
