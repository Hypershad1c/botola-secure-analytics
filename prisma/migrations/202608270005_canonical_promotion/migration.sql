-- Phase 9 canonical promotion idempotency
CREATE UNIQUE INDEX "Match_externalKey_key" ON "Match"("externalKey");
