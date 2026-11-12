-- CreateTable
CREATE TABLE "ImportRun" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "createdBy" TEXT,
    "fileName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'running',
    "total" INTEGER NOT NULL,
    "results" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBackup" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "cfsProductId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "data" JSONB NOT NULL,
    "restoredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportBackup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImportRun_shop_createdAt_idx" ON "ImportRun"("shop", "createdAt");

-- CreateIndex
CREATE INDEX "ImportBackup_shop_productId_createdAt_idx" ON "ImportBackup"("shop", "productId", "createdAt");

-- AddForeignKey
ALTER TABLE "ImportBackup" ADD CONSTRAINT "ImportBackup_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ImportRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Rules Prisma cannot express: only one running import or restore per shop
CREATE UNIQUE INDEX "ImportRun_one_running" ON "ImportRun"("shop") WHERE "status" = 'running';
ALTER TABLE "ImportRun" ADD CONSTRAINT "ImportRun_status_known" CHECK ("status" IN ('running', 'done', 'stopped'));
ALTER TABLE "ImportRun" ADD CONSTRAINT "ImportRun_kind_known" CHECK ("kind" IN ('import', 'restore'));

-- Keep these tables away from Supabase's public API, as with the other tables
ALTER TABLE "ImportRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ImportBackup" ENABLE ROW LEVEL SECURITY;
