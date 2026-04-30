-- CreateEnum
CREATE TYPE "PartnerLogoCategory" AS ENUM ('PARTNER', 'SPONSOR');

-- CreateTable
CREATE TABLE "PartnerLogo" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(191) NOT NULL,
    "category" "PartnerLogoCategory" NOT NULL,
    "logoUrl" TEXT NOT NULL,
    "websiteUrl" VARCHAR(500),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerLogo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PartnerLogo_category_isActive_sortOrder_idx" ON "PartnerLogo"("category", "isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "PartnerLogo_isActive_sortOrder_idx" ON "PartnerLogo"("isActive", "sortOrder");
