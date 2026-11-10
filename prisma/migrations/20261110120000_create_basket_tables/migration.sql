-- CreateTable
CREATE TABLE "Basket" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Basket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BasketLine" (
    "id" TEXT NOT NULL,
    "basketId" TEXT NOT NULL,
    "configurationKey" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "baseCents" INTEGER NOT NULL,
    "unitCents" INTEGER NOT NULL,
    "selection" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BasketLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Basket_shop_tokenHash_key" ON "Basket"("shop", "tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "BasketLine_basketId_configurationKey_key" ON "BasketLine"("basketId", "configurationKey");

-- AddForeignKey
ALTER TABLE "BasketLine" ADD CONSTRAINT "BasketLine_basketId_fkey" FOREIGN KEY ("basketId") REFERENCES "Basket"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Rules Prisma cannot express
ALTER TABLE "Basket" ADD CONSTRAINT "Basket_version_positive" CHECK ("version" >= 1);
ALTER TABLE "BasketLine" ADD CONSTRAINT "BasketLine_quantity_positive" CHECK ("quantity" >= 1);
ALTER TABLE "BasketLine" ADD CONSTRAINT "BasketLine_money_not_negative" CHECK ("baseCents" >= 0 AND "unitCents" >= 0);

-- Keep these tables away from Supabase's public API, as with Session
ALTER TABLE "Basket" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BasketLine" ENABLE ROW LEVEL SECURITY;
