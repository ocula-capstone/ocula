-- Appointments: why a visit was cancelled, and a faster "this patient's visits" lookup.
ALTER TABLE "appointments" ADD COLUMN "cancel_reason" TEXT;

DROP INDEX "appointments_patient_id_idx";
CREATE INDEX "appointments_patient_id_starts_at_idx" ON "appointments"("patient_id", "starts_at");
