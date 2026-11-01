// scripts/flush-db.ts
import path from "path";
import dotenv from "dotenv";

// Load environment variables from .env.local and .env
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ ERROR: DATABASE_URL is not defined in .env.local or .env");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

// Helper to delete an image file from ImageKit
async function deleteFromImageKit(fileId: string): Promise<boolean> {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!privateKey || !fileId) return false;

  try {
    const res = await fetch(`https://api.imagekit.io/v1/files/${encodeURIComponent(fileId)}`, {
      method: "DELETE",
      headers: { Authorization: `Basic ${Buffer.from(`${privateKey}:`).toString("base64")}` },
    });
    return res.ok || res.status === 404;
  } catch {
    return false;
  }
}

async function main() {
  console.log("\n==========================================");
  console.log("   🧹 BACHATNIX DATABASE FLUSH SCRIPT");
  console.log("==========================================\n");

  // 1. Current DB Counts
  const orderItemsCount = await prisma.orderItem.count();
  const ordersCount = await prisma.order.count();
  const productsCount = await prisma.product.count();
  const adminUsersCount = await prisma.user.count({ where: { role: "ADMIN" } });
  const buyerUsersCount = await prisma.user.count({ where: { role: { not: "ADMIN" } } });

  console.log("Current Database Status:");
  console.log(`- Products:    ${productsCount}`);
  console.log(`- Orders:      ${ordersCount}`);
  console.log(`- Order Items: ${orderItemsCount}`);
  console.log(`- Admin Users: ${adminUsersCount} (will be preserved)`);
  console.log(`- Buyer Users: ${buyerUsersCount}`);
  console.log("------------------------------------------\n");

  if (productsCount === 0 && ordersCount === 0 && orderItemsCount === 0) {
    console.log("✨ Database is already empty. No data to flush.");
    return;
  }

  // 2. Collect ImageKit files to clean up
  console.log("🔍 Scanning products for uploaded ImageKit files...");
  const productsWithImages = await prisma.product.findMany({
    select: { id: true, imageFileId: true, imageFileIds: true },
  });

  const fileIdsToDelete = new Set<string>();
  for (const p of productsWithImages) {
    if (p.imageFileId) fileIdsToDelete.add(p.imageFileId);
    for (const fid of p.imageFileIds || []) {
      if (fid) fileIdsToDelete.add(fid);
    }
  }

  if (fileIdsToDelete.size > 0 && process.env.IMAGEKIT_PRIVATE_KEY) {
    console.log(`🗑️  Found ${fileIdsToDelete.size} ImageKit media files. Cleaning up from ImageKit CDN...`);
    let deletedCount = 0;
    for (const fid of fileIdsToDelete) {
      const ok = await deleteFromImageKit(fid);
      if (ok) deletedCount++;
    }
    console.log(`✅ Cleaned up ${deletedCount}/${fileIdsToDelete.size} files from ImageKit.`);
  }

  // 3. Flush Database Records in safe dependency order
  console.log("\n🗑️  Flushing database tables...");

  // Delete Order Items first (foreign key to Order & Product)
  const deletedOrderItems = await prisma.orderItem.deleteMany();
  console.log(`✅ Deleted ${deletedOrderItems.count} Order Items.`);

  // Delete Orders (foreign key to User)
  const deletedOrders = await prisma.order.deleteMany();
  console.log(`✅ Deleted ${deletedOrders.count} Orders.`);

  // Delete Products
  const deletedProducts = await prisma.product.deleteMany();
  console.log(`✅ Deleted ${deletedProducts.count} Products.`);

  // Delete non-admin users (preserve ADMIN users so admin stays signed in)
  const deletedBuyers = await prisma.user.deleteMany({
    where: { role: { not: "ADMIN" } },
  });
  console.log(`✅ Deleted ${deletedBuyers.count} Buyer User accounts.`);
  console.log(`🛡️  Preserved ${adminUsersCount} Admin account(s) so you can still log in and create products.`);

  console.log("\n==========================================");
  console.log("🎉 SUCCESS! DATABASE HAS BEEN COMPLETELY FLUSHED.");
  console.log("You can now open /admin/products/new and upload fresh products!");
  console.log("==========================================\n");
}

main()
  .catch((err) => {
    console.error("\n❌ Flush script failed with error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

