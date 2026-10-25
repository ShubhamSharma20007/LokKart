import { NextResponse, type NextRequest } from "next/server";
import { listProductsPage, searchListing } from "@/lib/catalog";
import { parseListingParams } from "@/lib/listing-params";

// Home page: GET /api/products?cursor=<id>  ->  { products, nextCursor }
// Listing page: GET /api/products?q=&category=&min=&max=&sort=&page=2  ->  { products, page, totalPages, total }
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  try {
    if (sp.has("cursor")) {
      const cursor = sp.get("cursor");
      const data = await listProductsPage({ cursor: cursor || null });
      return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
    }

    const params = parseListingParams(Object.fromEntries(sp.entries()));
    const { products, page, totalPages, total } = await searchListing(params);
    return NextResponse.json(
      { products, page, totalPages, total },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("products api failed", err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}