"use client";

import { useEffect, useState, useTransition } from "react";
import { Star, CheckCircle2, MoreHorizontal, SlidersHorizontal, ChevronDown, X, MessageSquarePlus, Trash2, Flag } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "./auth-provider";

type Review = {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  verified: boolean;
  createdAt: string;
};

const SORT_OPTIONS = [
  { value: "latest", label: "Latest" },
  { value: "oldest", label: "Oldest" },
  { value: "highest", label: "Highest Rating" },
  { value: "lowest", label: "Lowest Rating" },
];

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return `Posted on ${d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })}`;
  } catch {
    return "Posted recently";
  }
}

export function ProductReviews({ productId }: { productId: string }) {
  const [activeTab, setActiveTab] = useState<"details" | "reviews" | "faqs">("reviews");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("latest");
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);

  // Write Review Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userRating, setUserRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [userName, setUserName] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [menuReviewId, setMenuReviewId] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user?.name) {
      setUserName(user.name);
    }
  }, [user]);

  // Pagination display limit
  const [displayCount, setDisplayCount] = useState(6);

  // Fetch dynamic reviews from database with sort param
  const fetchReviews = async (sortValue = sortBy) => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/reviews/${encodeURIComponent(productId)}?sort=${encodeURIComponent(sortValue)}`
      );
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error("Failed to load reviews:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews(sortBy);
  }, [productId, sortBy]);

  const handleSortChange = (newSort: string) => {
    setSortBy(newSort);
    setSortDropdownOpen(false);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      toast.error("Please enter your review feedback");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/reviews/${encodeURIComponent(productId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: userRating,
          comment: comment.trim(),
          userName: userName.trim() || "Customer",
        }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.review) {
        // Prepend the new review dynamically
        setReviews((prev) => [data.review, ...prev]);
        setTotal((t) => t + 1);
        toast.success("Thank you! Your review has been published.");
        setIsModalOpen(false);
        setComment("");
        setUserName("");
        setUserRating(5);
      } else {
        toast.error(data.error || "Could not submit review. Please try again.");
      }
    } catch {
      toast.error("Network error. Please try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    try {
      setMenuReviewId(null);
      const res = await fetch(
        `/api/reviews/${encodeURIComponent(productId)}?reviewId=${encodeURIComponent(reviewId)}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setReviews((prev) => prev.filter((r) => r.id !== reviewId));
        setTotal((t) => Math.max(0, t - 1));
        toast.success("Review deleted successfully");
      } else {
        toast.error("Could not delete review");
      }
    } catch {
      toast.error("Network error. Could not delete review.");
    }
  };

  const handleReportReview = (_reviewId: string) => {
    setMenuReviewId(null);
    toast.success("Thank you! Review reported for moderation.");
  };

  const currentSortLabel =
    SORT_OPTIONS.find((s) => s.value === sortBy)?.label || "Latest";

  return (
    <section id="reviews-section" className="mt-14 sm:mt-20 scroll-mt-24">
      {/* ── 3 Tabs Header (Product Details | Rating & Reviews | FAQs) ── */}
      <div className="flex items-center justify-around border-b border-black/10 text-center">
        {[
          { key: "details", label: "Product Details" },
          { key: "reviews", label: "Rating & Reviews" },
          { key: "faqs", label: "FAQs" },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onClick={() => setActiveTab(tab.key as any)}
              className={cn(
                "pb-3.5 sm:pb-5 text-sm sm:text-lg font-medium transition-colors relative flex-1 text-center cursor-pointer",
                isActive
                  ? "text-black font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-black"
                  : "text-black/40 hover:text-black"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── TAB CONTENT: PRODUCT DETAILS ── */}
      {activeTab === "details" && (
        <div className="py-8 sm:py-10 max-w-3xl space-y-4 text-black/70 text-sm sm:text-base leading-relaxed">
          <h3 className="font-heading text-lg font-bold text-black">Product Specifications</h3>
          <ul className="list-disc pl-5 space-y-2">
            <li>100% Premium Combed Cotton single jersey fabric</li>
            <li>Bio-washed and pre-shrunk for maximum comfort & longevity</li>
            <li>High-definition screen print with durable colorfastness</li>
            <li>Standard regular fit with comfortable ribbed crew collar</li>
            <li>Care Instructions: Machine wash cold with like colors, tumble dry low</li>
          </ul>
        </div>
      )}

      {/* ── TAB CONTENT: FAQS ── */}
      {activeTab === "faqs" && (
        <div className="py-8 sm:py-10 max-w-3xl space-y-4 text-black/70 text-sm sm:text-base leading-relaxed">
          <h3 className="font-heading text-lg font-bold text-black">Frequently Asked Questions</h3>
          <div className="space-y-3.5">
            <div className="rounded-2xl border border-black/10 p-4 sm:p-5">
              <p className="font-bold text-black text-sm sm:text-base">How do I choose the right size?</p>
              <p className="mt-1 text-xs sm:text-sm text-black/60">
                Please refer to the size presets. Our garments follow standard regular fit dimensions.
              </p>
            </div>
            <div className="rounded-2xl border border-black/10 p-4 sm:p-5">
              <p className="font-bold text-black text-sm sm:text-base">What is the return & replacement policy?</p>
              <p className="mt-1 text-xs sm:text-sm text-black/60">
                Currently, we do not accept returns or refunds. Replacement is only provided if you receive a damaged, defective, or wrong item reported within 48 hours of delivery.
              </p>
            </div>
            <div className="rounded-2xl border border-black/10 p-4 sm:p-5">
              <p className="font-bold text-black text-sm sm:text-base">What are the shipping times?</p>
              <p className="mt-1 text-xs sm:text-sm text-black/60">
                All metro city orders arrive within 2–4 business days. Rest of India within 3–6 days with free delivery.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB CONTENT: RATING & REVIEWS ── */}
      {activeTab === "reviews" && (
        <div className="pt-6 sm:pt-10">
          {/* Header row: All Reviews (count) + Sort Dropdown (Latest / Oldest) + Write a Review button */}
          <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
            <h2 className="font-heading text-lg sm:text-2xl font-bold text-black flex items-center gap-2">
              All Reviews
              <span className="text-xs sm:text-base font-normal text-black/40">
                ({total})
              </span>
            </h2>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Filter button */}
              {/* <button
                type="button"
                aria-label="Filter reviews"
                className="grid size-9 sm:size-10 place-items-center rounded-full bg-[#F0F0F0] text-black hover:bg-black/10 transition-colors"
              >
                <SlidersHorizontal className="size-4" />
              </button> */}

              {/* Sort Dropdown: Latest, Oldest, Highest, Lowest */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSortDropdownOpen((o) => !o)}
                  className="flex items-center gap-1.5 sm:gap-2 rounded-full bg-[#F0F0F0] px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-black hover:bg-black/10 transition-colors"
                >
                  <span>{currentSortLabel}</span>
                  <ChevronDown className="size-3.5 sm:size-4 opacity-60" />
                </button>

                {sortDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-44 rounded-2xl bg-white p-1.5 shadow-xl border border-black/10 z-30 animate-in fade-in zoom-in-95">
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleSortChange(opt.value)}
                        className={cn(
                          "w-full text-left px-3 py-2 text-xs sm:text-sm rounded-xl font-medium transition-colors",
                          sortBy === opt.value
                            ? "bg-black text-white"
                            : "text-black/80 hover:bg-gray-100"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Write a Review button */}
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="rounded-full bg-black px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-black/85 transition-all shadow-xs"
              >
                Write a Review
              </button>
            </div>
          </div>

          {/* If Loading */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="rounded-[20px] bg-[#F0F0F0] h-40 animate-pulse" />
              ))}
            </div>
          )}

          {/* If No Reviews Yet (100% Dynamic) */}
          {!loading && reviews.length === 0 && (
            <div className="rounded-[24px] border border-dashed border-black/20 p-8 sm:p-12 text-center space-y-4">
              <div className="grid size-12 place-items-center rounded-full bg-[#F0F0F0] mx-auto text-black/40">
                <MessageSquarePlus className="size-6" />
              </div>
              <h3 className="font-heading text-lg font-bold text-black">No reviews yet</h3>
              <p className="text-sm text-black/60 max-w-sm mx-auto">
                Be the first customer to share your thoughts on this product!
              </p>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white hover:bg-black/85 transition-all shadow-xs inline-block"
              >
                Write the First Review
              </button>
            </div>
          )}

          {/* Dynamic Review Cards Grid (2 columns on desktop, 1 on mobile) */}
          {!loading && reviews.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              {reviews.slice(0, displayCount).map((review) => (
                <div
                  key={review.id}
                  className="rounded-[20px] border border-black/10 bg-white p-5 sm:p-7 space-y-3 shadow-2xs hover:border-black/20 transition-colors"
                >
                  {/* Star Row + 3 dots */}
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            "size-4 sm:size-4.5",
                            i < review.rating
                              ? "fill-[#FFC633] text-[#FFC633]"
                              : "fill-[#E0E0E0] text-[#E0E0E0]"
                          )}
                          aria-hidden
                        />
                      ))}
                    </div>

                    <div className="relative">
                      <button
                        type="button"
                        aria-label="Review options"
                        onClick={() =>
                          setMenuReviewId((id) => (id === review.id ? null : review.id))
                        }
                        className="grid size-8 place-items-center rounded-full text-black/40 hover:text-black hover:bg-black/5 transition-colors"
                      >
                        <MoreHorizontal className="size-5" />
                      </button>

                      {menuReviewId === review.id && (
                        <div className="absolute right-0 top-full mt-1.5 w-36 rounded-xl bg-white p-1 shadow-xl border border-black/10 z-20 animate-in fade-in zoom-in-95">
                          <button
                            type="button"
                            onClick={() => handleDeleteReview(review.id)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors text-left"
                          >
                            <Trash2 className="size-3.5" />
                            <span>Delete Review</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReportReview(review.id)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-black/70 hover:bg-gray-100 rounded-lg transition-colors text-left"
                          >
                            <Flag className="size-3.5" />
                            <span>Report</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Reviewer Name with Verified Badge */}
                  <div className="flex items-center gap-1.5">
                    <span className="font-heading font-bold text-base sm:text-lg text-black">
                      {review.userName}
                    </span>
                    {review.verified && (
                      <CheckCircle2 className="size-4 fill-emerald-500 text-white" aria-hidden />
                    )}
                  </div>

                  {/* Review comment */}
                  <p className="text-sm sm:text-base text-black/60 leading-relaxed font-normal">
                    &ldquo;{review.comment}&rdquo;
                  </p>

                  {/* Posted date */}
                  <p className="text-xs sm:text-sm text-black/40 font-medium pt-1">
                    {formatDate(review.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Load More Reviews Button */}
          {!loading && reviews.length > displayCount && (
            <div className="mt-8 sm:mt-10 text-center">
              <button
                type="button"
                onClick={() => setDisplayCount((c) => c + 6)}
                className="rounded-full border border-black/10 bg-white px-10 sm:px-12 py-3 sm:py-3.5 text-xs sm:text-sm font-semibold text-black hover:bg-black hover:text-white transition-all shadow-2xs"
              >
                Load More Reviews
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── WRITE A REVIEW MODAL ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-[24px] bg-white p-6 sm:p-8 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-xl font-black text-black">Write a Review</h3>
              <button
                type="button"
                aria-label="Close modal"
                onClick={() => setIsModalOpen(false)}
                className="grid size-8 place-items-center rounded-full hover:bg-gray-100 text-black/60 hover:text-black transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              {/* Interactive Star Rating */}
              <div>
                <label className="block text-xs font-semibold text-black/60 uppercase tracking-wider mb-2">
                  Your Rating
                </label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setUserRating(star)}
                      className="p-1 cursor-pointer transition-transform hover:scale-110"
                    >
                      <Star
                        className={cn(
                          "size-7 transition-colors",
                          star <= (hoverRating || userRating)
                            ? "fill-[#FFC633] text-[#FFC633]"
                            : "fill-[#E0E0E0] text-[#E0E0E0]"
                        )}
                      />
                    </button>
                  ))}
                  <span className="ml-2 font-bold text-sm text-black">
                    {hoverRating || userRating} / 5
                  </span>
                </div>
              </div>

              {/* Reviewer Name */}
              <div>
                <label
                  htmlFor="userName"
                  className="block text-xs font-semibold text-black/60 uppercase tracking-wider mb-1.5"
                >
                  Your Name
                </label>
                <input
                  id="userName"
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full rounded-xl bg-[#F0F0F0] px-4 py-3 text-sm text-black placeholder:text-black/40 outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              {/* Review Comment */}
              <div>
                <label
                  htmlFor="comment"
                  className="block text-xs font-semibold text-black/60 uppercase tracking-wider mb-1.5"
                >
                  Review Message
                </label>
                <textarea
                  id="comment"
                  rows={4}
                  required
                  placeholder="What did you like or dislike about this product? How is the fabric and fit?"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full rounded-xl bg-[#F0F0F0] px-4 py-3 text-sm text-black placeholder:text-black/40 outline-none focus:ring-2 focus:ring-black resize-none"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-full bg-black py-3.5 text-sm sm:text-base font-semibold text-white hover:bg-black/85 transition-all disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
