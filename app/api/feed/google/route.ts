import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * GET /api/feed/google
 * Official Google Shopping / Merchant Center XML Product Feed.
 * Enables 100% Free Organic Listings on Google Shopping Tab & Google Images!
 */
export async function GET() {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://bachatnix.com").replace(/\/$/, "");

  try {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        price: true,
        stock: true,
        imageUrl: true,
        images: true,
      },
    });

    const itemsXml = products
      .map((p) => {
        const productUrl = `${baseUrl}/products/${p.id}`;
        const mainImage = p.imageUrl || p.images[0] || `${baseUrl}/favicon.png`;
        const availability = p.stock > 0 ? "in_stock" : "out_of_stock";
        const cleanDesc = (p.description || p.title)
          .replace(/[\r\n\t]+/g, " ")
          .trim()
          .slice(0, 1000);

        return `    <item>
      <g:id>${escapeXml(p.id)}</g:id>
      <g:title>${escapeXml(p.title)}</g:title>
      <g:description>${escapeXml(cleanDesc)}</g:description>
      <g:link>${escapeXml(productUrl)}</g:link>
      <g:image_link>${escapeXml(mainImage)}</g:image_link>
      <g:availability>${availability}</g:availability>
      <g:price>${p.price.toFixed(2)} INR</g:price>
      <g:brand>Bachatnix</g:brand>
      <g:condition>new</g:condition>
      <g:product_type>${escapeXml(p.category || "Apparel & Accessories > Clothing")}</g:product_type>
      <g:shipping>
        <g:country>IN</g:country>
        <g:service>Free Standard Delivery</g:service>
        <g:price>0.00 INR</g:price>
      </g:shipping>
    </item>`;
      })
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Bachatnix Store - Google Shopping Product Feed</title>
    <link>${baseUrl}</link>
    <description>Daily automated feed for Google Merchant Center free organic listings</description>
${itemsXml}
  </channel>
</rss>`;

    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "s-maxage=3600, stale-while-revalidate",
      },
    });
  } catch (err) {
    console.error("[Google Product Feed Error]:", err);
    return new NextResponse("Error generating feed", { status: 500 });
  }
}

