-- CreateTable
CREATE TABLE "CheckoutAttempt" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "basketId" TEXT,
    "basketVersion" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'creating',
    "lines" JSONB NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "draftOrderId" TEXT,
    "invoiceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckoutAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutAttempt_draftOrderId_key" ON "CheckoutAttempt"("draftOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutAttempt_basketId_basketVersion_key" ON "CheckoutAttempt"("basketId", "basketVersion");

-- AddForeignKey
ALTER TABLE "CheckoutAttempt" ADD CONSTRAINT "CheckoutAttempt_basketId_fkey" FOREIGN KEY ("basketId") REFERENCES "Basket"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Rules Prisma cannot express
ALTER TABLE "CheckoutAttempt" ADD CONSTRAINT "CheckoutAttempt_version_positive" CHECK ("basketVersion" >= 1);
ALTER TABLE "CheckoutAttempt" ADD CONSTRAINT "CheckoutAttempt_total_not_negative" CHECK ("totalCents" >= 0);
ALTER TABLE "CheckoutAttempt" ADD CONSTRAINT "CheckoutAttempt_status_known" CHECK ("status" IN ('creating', 'ready', 'failed'));
ALTER TABLE "CheckoutAttempt" ADD CONSTRAINT "CheckoutAttempt_ready_has_checkout" CHECK ("status" <> 'ready' OR ("draftOrderId" IS NOT NULL AND "invoiceUrl" IS NOT NULL));

-- Keep this table away from Supabase's public API, as with Session and Basket
ALTER TABLE "CheckoutAttempt" ENABLE ROW LEVEL SECURITY;
