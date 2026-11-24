-- Accounts v2: phone login on every account, optional patient email,
-- patient files without a login, and failed-attempt counters.

-- Users: email becomes optional (patients), phone becomes the unique login ID.
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "users" ADD COLUMN "phone" TEXT;
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- Patients: the file keeps its own name, copied from the login for existing rows.
ALTER TABLE "patients" ADD COLUMN "full_name" TEXT;
UPDATE "patients" p SET "full_name" = u."full_name" FROM "users" u WHERE p."user_id" = u."id";
UPDATE "patients" SET "full_name" = 'Unknown' WHERE "full_name" IS NULL;
ALTER TABLE "patients" ALTER COLUMN "full_name" SET NOT NULL;
CREATE INDEX "patients_full_name_idx" ON "patients"("full_name");

-- Patients: the login becomes optional; deleting a login keeps the patient file.
ALTER TABLE "patients" DROP CONSTRAINT "patients_user_id_fkey";
ALTER TABLE "patients" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "patients" ADD CONSTRAINT "patients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Failed-attempt counters for rate limiting.
CREATE TABLE "rate_limits" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "window_start" TIMESTAMP(3) NOT NULL,
    "locked_until" TIMESTAMP(3),

    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("key")
);
