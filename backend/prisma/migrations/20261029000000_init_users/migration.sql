CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "displayName" VARCHAR(80) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_createdAt_id_idx" ON "User"("createdAt", "id");
