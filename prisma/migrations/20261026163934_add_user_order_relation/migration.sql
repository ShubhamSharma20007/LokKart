/*
  Warnings:

  - Made the column `userId` on table `Order` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_userId_fkey";

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_orderId_fkey";

-- DropIndex
DROP INDEX "Order_ref_key";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "city" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "codCharge" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pincode" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "shipping" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "state" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "subtotal" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "userId" SET NOT NULL,
ALTER COLUMN "address" SET DEFAULT '',
ALTER COLUMN "address" SET DATA TYPE TEXT;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
