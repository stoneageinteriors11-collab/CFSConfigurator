-- AlterTable
ALTER TABLE "BasketLine" ADD COLUMN     "handle" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "title" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "variantTitle" TEXT NOT NULL DEFAULT '';

