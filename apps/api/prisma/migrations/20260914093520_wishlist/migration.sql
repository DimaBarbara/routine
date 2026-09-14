-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "wishlist";

-- CreateEnum
CREATE TYPE "wishlist"."WishPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "wishlist"."Wishlist" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "shareToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wishlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishlist"."WishlistItem" (
    "id" TEXT NOT NULL,
    "wishlistId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "imageUrl" TEXT,
    "priceMinor" INTEGER,
    "currency" CHAR(3) NOT NULL DEFAULT 'UAH',
    "priority" "wishlist"."WishPriority" NOT NULL DEFAULT 'MEDIUM',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WishlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishlist"."WishReservation" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "userId" TEXT,
    "guestName" TEXT,
    "guestTokenHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WishReservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Wishlist_shareToken_key" ON "wishlist"."Wishlist"("shareToken");

-- CreateIndex
CREATE INDEX "Wishlist_spaceId_idx" ON "wishlist"."Wishlist"("spaceId");

-- CreateIndex
CREATE INDEX "WishlistItem_wishlistId_idx" ON "wishlist"."WishlistItem"("wishlistId");

-- CreateIndex
CREATE UNIQUE INDEX "WishReservation_itemId_key" ON "wishlist"."WishReservation"("itemId");

-- CreateIndex
CREATE INDEX "WishReservation_guestTokenHash_idx" ON "wishlist"."WishReservation"("guestTokenHash");

-- AddForeignKey
ALTER TABLE "wishlist"."Wishlist" ADD CONSTRAINT "Wishlist_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "public"."Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist"."Wishlist" ADD CONSTRAINT "Wishlist_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist"."WishlistItem" ADD CONSTRAINT "WishlistItem_wishlistId_fkey" FOREIGN KEY ("wishlistId") REFERENCES "wishlist"."Wishlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist"."WishReservation" ADD CONSTRAINT "WishReservation_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "wishlist"."WishlistItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist"."WishReservation" ADD CONSTRAINT "WishReservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

