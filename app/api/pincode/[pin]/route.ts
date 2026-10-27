import { NextResponse } from "next/server";

type PostOffice = { Name: string; District: string; State: string };

export async function GET(_req: Request, ctx: { params: Promise<{ pin: string }> }) {
  const { pin } = await ctx.params;
  if (!/^[1-9]\d{5}$/.test(pin)) {
    return NextResponse.json({ error: "Invalid pincode" }, { status: 400 });
  }

  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`, {
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 60 * 60 * 24 * 30 }, // a pincode's district rarely changes
    });
    const json = await res.json();
    const entry = json?.[0];
    const offices: PostOffice[] = entry?.Status === "Success" ? (entry.PostOffice ?? []) : [];

    if (offices.length === 0) return NextResponse.json({ found: false });
    return NextResponse.json({
      found: true,
      district: offices[0].District,
      state: offices[0].State,
      areas: [...new Set(offices.map((o) => o.Name))],
    });
  } catch {
    return NextResponse.json({ error: "Lookup failed" }, { status: 502 });
  }
}