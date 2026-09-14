-- DropForeignKey
ALTER TABLE "Counter" DROP CONSTRAINT "Counter_spaceId_fkey";

-- DropForeignKey
ALTER TABLE "Counter" DROP CONSTRAINT "Counter_updatedById_fkey";

-- DropTable
DROP TABLE "Counter";

