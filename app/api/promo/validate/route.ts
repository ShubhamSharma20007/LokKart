import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyFirebaseToken } from "@/lib/firebase-token";

// Seed WELCOME20 promo code if it doesn't exist yet
async function ensureWelcome20() {
  await prisma.promoCode.upsert({
    where: { code: "WELCOME20" },
    update: {},
    create: {
      code: "WELCOME20",
      discountPct: 20,
      maxUsesPerUser: 1,
      active: true,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { code?: string; token?: string };
    const code = (body.code ?? "").trim().toUpperCase();
    const token = body.token ?? "";

    if (!code) {
      return NextResponse.json({ ok: false, message: "Please enter a promo code." }, { status: 400 });
    }

    // Seed WELCOME20 on first use
    await ensureWelcome20();

    // Find the promo code
    const promo = await prisma.promoCode.findUnique({ where: { code } });
    if (!promo || !promo.active) {
      return NextResponse.json({ ok: false, message: "Invalid or expired promo code." }, { status: 400 });
    }

    // If user is logged in, check if they already used this code
    if (token) {
      const decoded = await verifyFirebaseToken(token).catch(() => null);
      if (decoded?.email) {
        const user = await prisma.user.findUnique({ where: { email: decoded.email } });
        if (user) {
          const alreadyUsed = await prisma.promoCodeUsage.findUnique({
            where: { promoCodeId_userId: { promoCodeId: promo.id, userId: user.id } },
          });
          if (alreadyUsed) {
            return NextResponse.json(
              { ok: false, message: "You have already used this promo code." },
              { status: 400 }
            );
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      discountPct: promo.discountPct,
      promoId: promo.id,
      message: `${promo.discountPct}% discount applied!`,
    });
  } catch (err) {
    console.error("[promo/validate]", err);
    return NextResponse.json({ ok: false, message: "Failed to validate promo code." }, { status: 500 });
  }
}

