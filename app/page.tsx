import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { ProductCard } from "@/components/product-card";
import { getNewArrivals, getTopSelling } from "@/lib/catalog";
import { TestimonialSlider } from "@/components/testimonial-slider";
import { HeroStats } from "@/components/hero-stats";

// ─── Product grid skeleton ───────────────────────────────────────────────────
function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-6 sm:grid-cols-2 md:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="space-y-3">
          <div className="aspect-square w-full rounded-[20px] bg-[#F0EEED] animate-pulse" />
          <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

// ─── Async Product Showcase Sections ─────────────────────────────────────────
async function ProductSections() {
  await connection();
  const [newArrivals, topSelling] = await Promise.all([
    getNewArrivals(4),
    getTopSelling(4),
  ]);

  return (
    <>
      {/* ── NEW ARRIVALS ── */}
      <section id="new-arrivals" className="mx-auto max-w-6xl px-4 py-12 sm:py-16 scroll-mt-24">
        <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-black text-center text-black uppercase tracking-tight mb-8 sm:mb-12">
          NEW ARRIVALS
        </h2>

        <div className="grid grid-cols-2 gap-4 sm:gap-6 sm:grid-cols-2 md:grid-cols-4">
          {newArrivals.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {/* View All Button */}
        <div className="mt-8 sm:mt-12 text-center">
          <Link
            href="/products"
            className="inline-block rounded-full border border-black/10 bg-white px-14 sm:px-16 py-3.5 sm:py-4 text-sm sm:text-base font-medium text-black hover:bg-black hover:text-white transition-all shadow-2xs"
          >
            View All
          </Link>
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="mx-auto max-w-6xl px-4">
        <hr className="border-black/10" />
      </div>

      {/* ── TOP SELLING ── */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-black text-center text-black uppercase tracking-tight mb-8 sm:mb-12">
          TOP SELLING
        </h2>

        <div className="grid grid-cols-2 gap-4 sm:gap-6 sm:grid-cols-2 md:grid-cols-4">
          {topSelling.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {/* View All Button */}
        <div className="mt-8 sm:mt-12 text-center">
          <Link
            href="/products"
            className="inline-block rounded-full border border-black/10 bg-white px-14 sm:px-16 py-3.5 sm:py-4 text-sm sm:text-base font-medium text-black hover:bg-black hover:text-white transition-all shadow-2xs"
          >
            View All
          </Link>
        </div>
      </section>
    </>
  );
}

// ─── Homepage Component ───────────────────────────────────────────────────────
export default function Home() {
  return (
    <main className="bg-white text-black min-h-screen">
      {/* ════════════════════════════════════════════
          HERO SECTION — Shop.co Figma exact design
      ════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-[#F2F0F1]">
        {/* Fixed-height hero container so models fill end-to-end */}
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid md:grid-cols-2 items-end md:min-h-[600px] lg:min-h-[660px]">

            {/* ── Left: Text + CTA + Stats ── */}
            <div className="relative z-10 flex flex-col justify-center py-10 md:py-16 md:pr-8">
              <h1 className="font-heading text-4xl sm:text-5xl md:text-[52px] lg:text-[64px] font-black leading-[1.0] tracking-tight text-black">
                FIND CLOTHES
                <br />
                THAT MATCHES
                <br />
                YOUR STYLE
              </h1>

              <p className="mt-5 max-w-sm text-sm sm:text-base text-black/60 leading-relaxed">
                Browse through our diverse range of meticulously crafted garments, designed
                to bring out your individuality and cater to your sense of style.
              </p>

              <div className="mt-8">
                <Link
                  href="/products"
                  className="inline-block w-full sm:w-auto text-center rounded-full bg-black text-white px-14 py-4 text-sm sm:text-base font-medium hover:bg-black/85 transition-all"
                >
                  Shop Now
                </Link>
              </div>

              {/* Animated Stats */}
              <HeroStats />
            </div>

            {/* ── Right: Models image — fills full column height, wide ── */}
            <div className="relative flex items-end justify-center md:justify-end self-stretch">
              {/* Big star — top right corner */}
              <div className="absolute top-6 right-0 md:top-10 md:right-2 z-20 pointer-events-none">
                <Image
                  src="/big_vector.png"
                  alt=""
                  width={76}
                  height={76}
                  className="size-14 sm:size-16 md:size-20 select-none"
                  aria-hidden
                />
              </div>
              {/* Small star — left-centre */}
              <div className="absolute top-1/2 left-0 -translate-y-8 z-20 pointer-events-none">
                <Image
                  src="/small_vector.png"
                  alt=""
                  width={40}
                  height={40}
                  className="size-8 sm:size-10 select-none"
                  aria-hidden
                />
              </div>

              {/* Model photo — wide, bottom-anchored, no height cap on desktop */}
              <Image
                src="/models.png"
                alt="Fashion model showcasing our clothing collection"
                width={800}
                height={700}
                className="relative z-10 w-full h-[280px] sm:h-[380px] md:h-auto md:max-h-[680px] object-contain object-bottom"
                priority
              />
            </div>

          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          BRANDS STRIP (Black bar from Image 1 & 4)
      ════════════════════════════════════════════ */}
      <section className="bg-black text-white py-8 sm:py-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 sm:gap-8 px-6 text-center">
          <span className="font-serif text-2xl sm:text-3xl font-extrabold tracking-widest uppercase">
            VERSACE
          </span>
          <span className="font-serif text-2xl sm:text-3xl font-bold tracking-wider uppercase">
            ZARA
          </span>
          <span className="font-serif text-2xl sm:text-3xl font-bold tracking-wider uppercase">
            GUCCI
          </span>
          <span className="font-serif text-2xl sm:text-3xl font-black tracking-widest uppercase">
            PRADA
          </span>
          <span className="font-sans text-xl sm:text-2xl font-light tracking-widest uppercase">
            Calvin Klein
          </span>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          NEW ARRIVALS + TOP SELLING (Image 2 & 5)
      ════════════════════════════════════════════ */}
      <Suspense
        fallback={
          <div className="mx-auto max-w-6xl space-y-16 px-4 py-16">
            <ProductGridSkeleton />
            <ProductGridSkeleton />
          </div>
        }
      >
        <ProductSections />
      </Suspense>

      {/* ════════════════════════════════════════════
          BROWSE BY DRESS STYLE (Image 1 & 3)
      ════════════════════════════════════════════ */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-[36px] sm:rounded-[40px] bg-[#F0F0F0] p-6 sm:p-10 md:p-14">
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-black text-center text-black uppercase tracking-tight mb-8 sm:mb-12">
            BROWSE BY DRESS STYLE
          </h2>

          <div className="grid grid-cols-12 gap-4 sm:gap-5">
            {/* Row 1, Card 1: Casual — 5/12 cols (narrower) */}
            <Link
              href="/products?category=Casual"
              className="col-span-12 md:col-span-5 relative h-[200px] sm:h-[240px] md:h-[280px] rounded-[20px] bg-white overflow-hidden group shadow-sm transition-transform duration-300 hover:scale-[1.01]"
            >
              <img
                src="/causal.png"
                alt="Casual Dress Style"
                className="absolute inset-0 size-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
              />
              <span className="absolute top-5 left-5 z-10 font-heading text-xl sm:text-2xl font-bold text-black drop-shadow-sm">
                Casual
              </span>
            </Link>

            {/* Row 1, Card 2: Formal — 7/12 cols (wider) */}
            <Link
              href="/products?category=Formal"
              className="col-span-12 md:col-span-7 relative h-[200px] sm:h-[240px] md:h-[280px] rounded-[20px] bg-white overflow-hidden group shadow-sm transition-transform duration-300 hover:scale-[1.01]"
            >
              <img
                src="/formal.png"
                alt="Formal Dress Style"
                className="absolute inset-0 size-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
              />
              <span className="absolute top-5 left-5 z-10 font-heading text-xl sm:text-2xl font-bold text-black drop-shadow-sm">
                Formal
              </span>
            </Link>

            {/* Row 2, Card 3: Party — 7/12 cols (wider) */}
            <Link
              href="/products?category=Party"
              className="col-span-12 md:col-span-7 relative h-[200px] sm:h-[240px] md:h-[280px] rounded-[20px] bg-white overflow-hidden group shadow-sm transition-transform duration-300 hover:scale-[1.01]"
            >
              <img
                src="/party.png"
                alt="Party Dress Style"
                className="absolute inset-0 size-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
              />
              <span className="absolute top-5 left-5 z-10 font-heading text-xl sm:text-2xl font-bold text-black drop-shadow-sm">
                Party
              </span>
            </Link>

            {/* Row 2, Card 4: Gym — 5/12 cols (narrower) */}
            <Link
              href="/products?category=Sportswear"
              className="col-span-12 md:col-span-5 relative h-[200px] sm:h-[240px] md:h-[280px] rounded-[20px] bg-white overflow-hidden group shadow-sm transition-transform duration-300 hover:scale-[1.01]"
            >
              <img
                src="/gym.png"
                alt="Gym Dress Style"
                className="absolute inset-0 size-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
              />
              <span className="absolute top-5 left-5 z-10 font-heading text-xl sm:text-2xl font-bold text-black drop-shadow-sm">
                Gym
              </span>
            </Link>
          </div>
        </div>
      </section>

      <TestimonialSlider />
    </main>
  );
}
