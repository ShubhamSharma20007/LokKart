-- AlterTable: add nimbusOrderId to Order (nullable - null for UPI orders or if NimbusPost push failed)
ALTER TABLE "Order" ADD COLUMN "nimbusOrderId" TEXT;

