import { NextRequest, NextResponse } from "next/server";
import { listProductsPage, searchListing } from "@/lib/catalog";
import { parseListingParams } from "@/lib/listing-params";

// export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");

    // 1. Dashboard / Landing Page: Cursor-based infinite scroll
    if (cursor !== null) {
      const data = await listProductsPage({
        cursor: cursor || undefined,
        limit: 12,
      });
      return NextResponse.json(data);
    }

    // 2. Products Listing Page: Filter, search, and sort infinite scroll
    const raw: Record<string, string> = {};
    searchParams.forEach((val, key) => {
      raw[key] = val;
    });

    const params = parseListingParams(raw);
    const result = await searchListing(params);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[API Products Error]", error);
    return NextResponse.json({ ok: false, error: "Failed to fetch products" }, { status: 500 });
  }
}

