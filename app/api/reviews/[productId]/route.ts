import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const url = new URL(req.url);
    const sort = url.searchParams.get("sort") || "latest";

    let orderBy: any = { createdAt: "desc" };
    if (sort === "oldest") {
      orderBy = { createdAt: "asc" };
    } else if (sort === "highest") {
      orderBy = [{ rating: "desc" }, { createdAt: "desc" }];
    } else if (sort === "lowest") {
      orderBy = [{ rating: "asc" }, { createdAt: "desc" }];
    }

    // Dynamic database reviews only
    const reviews = await prisma.review.findMany({
      where: { productId },
      orderBy,
      take: 100,
    });

    const total = reviews.length;
    const avg =
      total > 0
        ? Number(
            (reviews.reduce((acc, r) => acc + r.rating, 0) / total).toFixed(1)
          )
        : 0;

    return NextResponse.json({
      reviews,
      total,
      averageRating: avg,
    });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json({
      reviews: [],
      total: 0,
      averageRating: 0,
    });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const body = await req.json();

    const { rating, comment, userName, userEmail } = body;

    const numRating = Number(rating);
    if (!numRating || isNaN(numRating) || numRating < 1 || numRating > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    const trimmedComment = String(comment || "").trim();
    if (!trimmedComment || trimmedComment.length < 3) {
      return NextResponse.json(
        { error: "Review message must be at least 3 characters" },
        { status: 400 }
      );
    }

    const cleanName = String(userName || "").trim() || "Verified Buyer";

    const review = await prisma.review.create({
      data: {
        productId,
        rating: Math.round(numRating),
        comment: trimmedComment,
        userName: cleanName,
        userEmail: userEmail ? String(userEmail).trim() : null,
        verified: true,
      },
    });

    return NextResponse.json({ success: true, review });
  } catch (error) {
    console.error("Error submitting review:", error);
    return NextResponse.json(
      { error: "Failed to submit review" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const url = new URL(req.url);
    const reviewId = url.searchParams.get("reviewId");

    if (!reviewId) {
      return NextResponse.json(
        { error: "Review ID is required" },
        { status: 400 }
      );
    }

    await prisma.review.delete({
      where: { id: reviewId },
    });

    return NextResponse.json({ success: true, message: "Review deleted" });
  } catch (error) {
    console.error("Error deleting review:", error);
    return NextResponse.json(
      { error: "Failed to delete review" },
      { status: 500 }
    );
  }
}
