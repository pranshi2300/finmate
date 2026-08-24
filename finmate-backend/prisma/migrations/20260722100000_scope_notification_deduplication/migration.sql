-- Rule keys are shared templates, so uniqueness must be scoped to each user.
DROP INDEX "notifications_dedupeKey_key";
CREATE UNIQUE INDEX "notifications_userId_dedupeKey_key" ON "notifications"("userId", "dedupeKey");
