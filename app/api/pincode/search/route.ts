import { NextResponse, type NextRequest } from "next/server";

type PostOffice = { Name: string; District: string; State: string; Pincode: string };

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 40);
  if (q.length < 3) return NextResponse.json({ results: [] });

  try {
    const res = await fetch(`https://api.postalpincode.in/postoffice/${encodeURIComponent(q)}`, {
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 60 * 60 * 24 },
    });
    const json = await res.json();
    const offices: PostOffice[] = json?.[0]?.Status === "Success" ? (json[0].PostOffice ?? []) : [];

    const seen = new Set<string>();
    const results = offices
      .filter((o) => (seen.has(o.Pincode) ? false : (seen.add(o.Pincode), true)))
      .slice(0, 15)
      .map((o) => ({ name: o.Name, district: o.District, state: o.State, pincode: o.Pincode }));

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}