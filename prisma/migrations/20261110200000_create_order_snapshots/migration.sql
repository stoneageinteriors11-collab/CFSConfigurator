-- CreateTable
CREATE TABLE "OrderSnapshot" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderName" TEXT NOT NULL,
    "attemptId" TEXT,
    "matchStatus" TEXT NOT NULL,
    "specification" JSONB NOT NULL,
    "financialStatus" TEXT NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderSnapshot_attemptId_key" ON "OrderSnapshot"("attemptId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderSnapshot_shop_orderId_key" ON "OrderSnapshot"("shop", "orderId");

-- AddForeignKey
ALTER TABLE "OrderSnapshot" ADD CONSTRAINT "OrderSnapshot_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "CheckoutAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Rules Prisma cannot express
ALTER TABLE "OrderSnapshot" ADD CONSTRAINT "OrderSnapshot_match_known" CHECK ("matchStatus" IN ('matched', 'no_attempt', 'price_mismatch'));
ALTER TABLE "OrderSnapshot" ADD CONSTRAINT "OrderSnapshot_no_attempt_has_none" CHECK (("matchStatus" = 'no_attempt') = ("attemptId" IS NULL));
ALTER TABLE "OrderSnapshot" ADD CONSTRAINT "OrderSnapshot_specification_is_object" CHECK (jsonb_typeof("specification") = 'object');

-- A saved specification, and which order it belongs to, can never change
CREATE FUNCTION "OrderSnapshot_keep_specification"() RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW."specification" IS DISTINCT FROM OLD."specification"
    OR NEW."shop" IS DISTINCT FROM OLD."shop"
    OR NEW."orderId" IS DISTINCT FROM OLD."orderId"
    OR NEW."attemptId" IS DISTINCT FROM OLD."attemptId"
  THEN
    RAISE EXCEPTION 'An order snapshot cannot be changed' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "OrderSnapshot_keep_specification"
BEFORE UPDATE ON "OrderSnapshot"
FOR EACH ROW EXECUTE FUNCTION "OrderSnapshot_keep_specification"();

-- Keep this table away from Supabase's public API, as with the other tables
ALTER TABLE "OrderSnapshot" ENABLE ROW LEVEL SECURITY;
