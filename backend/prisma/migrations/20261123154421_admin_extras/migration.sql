-- AlterTable
ALTER TABLE "branches" ADD COLUMN     "online_booking_enabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "clinic_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "recall_interval_months" INTEGER NOT NULL DEFAULT 12,
    "recall_window_days" INTEGER NOT NULL DEFAULT 30,
    "low_stock_threshold" INTEGER NOT NULL DEFAULT 3,
    "force_password_change" BOOLEAN NOT NULL DEFAULT true,
    "updated_by_id" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinic_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- AddForeignKey
ALTER TABLE "clinic_settings" ADD CONSTRAINT "clinic_settings_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
