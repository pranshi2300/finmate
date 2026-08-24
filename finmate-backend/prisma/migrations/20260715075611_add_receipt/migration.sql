-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "receiptId" TEXT;

-- CreateTable
CREATE TABLE "receipts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "vendor" TEXT,
    "receiptDate" TIMESTAMP(3),
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "taxAmount" DECIMAL(12,2),
    "tipAmount" DECIMAL(12,2),
    "items" JSONB,
    "rawOcrText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "receipts_userId_receiptDate_idx" ON "receipts"("userId", "receiptDate");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
