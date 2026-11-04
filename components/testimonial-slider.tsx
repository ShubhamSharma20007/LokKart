"use client";

import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";
import { Star, CheckCircle2 } from "lucide-react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const TESTIMONIALS = [
  {
    name: "Priya Sharma",
    avatar:
      "https://api.dicebear.com/7.x/avataaars/svg?seed=PriyaSharma&backgroundColor=b6e3f4&clothingColor=black&skinColor=brown",
    text: "Bachatnix se shopping karna bahut acha experience tha! Kapde ki quality bilkul mast hai aur delivery bhi 3 din mein aa gayi. Definitely recommend karungi apni saheliyon ko!",
    rating: 5,
  },
  {
    name: "Rahul Verma",
    avatar:
      "https://api.dicebear.com/7.x/avataaars/svg?seed=RahulVerma&backgroundColor=c0aede&clothingColor=black&skinColor=brown",
    text: "Yaar, seriously impressed hun! T-shirt ki stitching ekdum tight hai aur fitting bhi perfect. Price bhi budget mein hai. Ek aur order karni wala hun abhi!",
    rating: 5,
  },
  {
    name: "Anjali Gupta",
    avatar:
      "https://api.dicebear.com/7.x/avataaars/svg?seed=AnjaliGupta&backgroundColor=ffd5dc&clothingColor=black&skinColor=light",
    text: "Main bahut selective hoon fashion ke mamle mein, par Bachatnix ne mujhe impress kar diya. Designs trendy hain aur material soft hai. COD option bhi available hai jo mujhe bahut pasand aaya!",
    rating: 5,
  },
  {
    name: "Arjun Patel",
    avatar:
      "https://api.dicebear.com/7.x/avataaars/svg?seed=ArjunPatel&backgroundColor=d1f4cc&clothingColor=black&skinColor=tanned",
    text: "Gym wear order kiya tha — fabric ekdum breathable hai aur colors bhi fade nahi hue washing ke baad. Value for money is top-notch. 5 stars deserved!",
    rating: 5,
  },
];

function StarRow({ count = 5 }: { count: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} className="size-4 sm:size-5 fill-[#FFC633] text-[#FFC633]" aria-hidden />
      ))}
    </div>
  );
}

export function TestimonialSlider() {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "start",
    slidesToScroll: 1,
  });

  const [prevDisabled, setPrevDisabled] = useState(false);
  const [nextDisabled, setNextDisabled] = useState(false);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setPrevDisabled(!emblaApi.canScrollPrev());
    setNextDisabled(!emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    onSelect();
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      {/* Header */}
      <div className="mb-8 sm:mb-10 flex items-center justify-between">
        <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-black text-black tracking-tight">
          OUR HAPPY CUSTOMERS
        </h2>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={scrollPrev}
            disabled={prevDisabled}
            aria-label="Previous testimonials"
            className="grid size-10 place-items-center rounded-full border border-black/10 bg-white text-black hover:bg-black hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={scrollNext}
            disabled={nextDisabled}
            aria-label="Next testimonials"
            className="grid size-10 place-items-center rounded-full border border-black/10 bg-white text-black hover:bg-black hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>

      {/* Embla Viewport */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-5">
          {TESTIMONIALS.map(({ name, avatar, text, rating }) => (
            <div
              key={name}
              className="flex-none w-[85vw] sm:w-[calc(50%-10px)] lg:w-[calc(33.333%-14px)] rounded-[20px] border border-black/10 bg-white p-7 sm:p-8 space-y-3.5 shadow-2xs"
            >
              <StarRow count={rating} />
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {/* <img
                  src={avatar}
                  alt={name}
                  width={40}
                  height={40}
                  className="size-10 rounded-full object-cover border border-black/10 bg-gray-100 shrink-0"
                /> */}
                <div className="flex items-center gap-1.5">
                  <span className="font-heading font-bold text-lg text-black">{name}</span>
                  <CheckCircle2 className="size-4 fill-emerald-500 text-white" aria-hidden />
                </div>
              </div>
              <p className="text-sm sm:text-base text-black/60 leading-relaxed font-normal">
                &ldquo;{text}&rdquo;
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

