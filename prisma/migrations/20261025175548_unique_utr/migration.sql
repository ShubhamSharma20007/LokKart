/*
  Warnings:

  - A unique constraint covering the columns `[upiTxnId]` on the table `Order` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Order_upiTxnId_key" ON "Order"("upiTxnId");
