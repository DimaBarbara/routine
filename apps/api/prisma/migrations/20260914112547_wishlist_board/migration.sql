-- Вішліст: списки → одна канбан-дошка на простір.
-- Порядок свідомо ручний: спершу нові таблиці й перенесення даних, лише потім видалення старих.

-- 1. Нові типи
CREATE TYPE "wishlist"."WishStatus" AS ENUM ('WANT', 'NEED', 'THINKING', 'DONE');
CREATE TYPE "wishlist"."WishDoneKind" AS ENUM ('BOUGHT', 'GIFTED');
CREATE TYPE "wishlist"."WishCategory" AS ENUM ('CLOTHES', 'BEAUTY', 'SPORT', 'TECH', 'HOME', 'BOOKS', 'HOBBY', 'TRAVEL', 'HEALTH', 'KIDS', 'FOOD', 'OTHER');

-- 2. Нові таблиці
CREATE TABLE "wishlist"."WishItem" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "ownerId" TEXT,
    "createdById" TEXT,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "imageUrl" TEXT,
    "priceMinor" INTEGER,
    "currency" CHAR(3) NOT NULL DEFAULT 'UAH',
    "priority" "wishlist"."WishPriority" NOT NULL DEFAULT 'MEDIUM',
    "category" "wishlist"."WishCategory" NOT NULL DEFAULT 'OTHER',
    "note" TEXT,
    "status" "wishlist"."WishStatus" NOT NULL DEFAULT 'WANT',
    "position" DOUBLE PRECISION NOT NULL,
    "doneKind" "wishlist"."WishDoneKind",
    "doneAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WishItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "wishlist"."WishShareLink" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WishShareLink_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WishItem_spaceId_status_position_idx" ON "wishlist"."WishItem"("spaceId", "status", "position");
CREATE UNIQUE INDEX "WishShareLink_token_key" ON "wishlist"."WishShareLink"("token");
CREATE UNIQUE INDEX "WishShareLink_spaceId_userId_key" ON "wishlist"."WishShareLink"("spaceId", "userId");

-- 3. Перенесення: бажання зі списків → колонка «Бажання» дошки простору.
--    id зберігаються, тож резервації лишаються привʼязаними до тих самих бажань.
INSERT INTO "wishlist"."WishItem" (
    "id", "spaceId", "ownerId", "createdById", "title", "url", "imageUrl", "priceMinor",
    "currency", "priority", "category", "note", "status", "position", "createdAt", "updatedAt"
)
SELECT
    i."id", w."spaceId", w."ownerId", w."ownerId", i."title", i."url", i."imageUrl", i."priceMinor",
    i."currency", i."priority", 'OTHER', i."note", 'WANT',
    1000 * ROW_NUMBER() OVER (PARTITION BY w."spaceId" ORDER BY i."createdAt"),
    i."createdAt", i."updatedAt"
FROM "wishlist"."WishlistItem" i
JOIN "wishlist"."Wishlist" w ON w."id" = i."wishlistId";

-- 4. Резервації: перепривʼязати зовнішній ключ до нової таблиці
ALTER TABLE "wishlist"."WishReservation" DROP CONSTRAINT "WishReservation_itemId_fkey";
ALTER TABLE "wishlist"."WishReservation" ADD CONSTRAINT "WishReservation_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "wishlist"."WishItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. Старі списки більше не потрібні
DROP TABLE "wishlist"."WishlistItem";
DROP TABLE "wishlist"."Wishlist";

-- 6. Звʼязки нових таблиць (схема public — явно, незалежно від search_path)
ALTER TABLE "wishlist"."WishItem" ADD CONSTRAINT "WishItem_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "public"."Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wishlist"."WishItem" ADD CONSTRAINT "WishItem_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "wishlist"."WishItem" ADD CONSTRAINT "WishItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "wishlist"."WishShareLink" ADD CONSTRAINT "WishShareLink_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "public"."Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wishlist"."WishShareLink" ADD CONSTRAINT "WishShareLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
