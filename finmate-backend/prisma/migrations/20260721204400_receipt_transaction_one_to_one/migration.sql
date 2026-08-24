-- Add unique constraint to ensure each receipt can be linked to at most one transaction
ALTER TABLE "transactions"
ADD CONSTRAINT "transactions_receiptId_unique" UNIQUE ("receiptId");
