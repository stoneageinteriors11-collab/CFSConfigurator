-- CreateTable
CREATE TABLE "OrderRecovery" (
    "shop" TEXT NOT NULL,
    "checkedUntil" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderRecovery_pkey" PRIMARY KEY ("shop")
);

-- Keep this table away from Supabase's public API, as with the other tables
ALTER TABLE "OrderRecovery" ENABLE ROW LEVEL SECURITY;
