"use client";

import { useEffect, useState } from "react";

// Buttery smooth ease-out-quart curve (natural deceleration like Apple UI)
function easeOutQuart(x: number): number {
  return 1 - Math.pow(1 - x, 4);
}

function CountUp({
  target,
  duration = 2000,
  delay = 120,
  suffix = "",
}: {
  target: number;
  duration?: number;
  delay?: number;
  suffix?: string;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let frameId: number;
    let startTimestamp: number | null = null;

    // Small delay allows browser to finish initial page paint without dropping frames
    const delayTimer = setTimeout(() => {
      const step = (timestamp: number) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const elapsed = timestamp - startTimestamp;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeOutQuart(progress);
        
        setCount(Math.round(eased * target));

        if (progress < 1) {
          frameId = requestAnimationFrame(step);
        } else {
          setCount(target);
        }
      };

      frameId = requestAnimationFrame(step);
    }, delay);

    return () => {
      clearTimeout(delayTimer);
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [target, duration, delay]);

  return (
    <span className="inline-block tabular-nums font-bold tracking-tight">
      {count.toLocaleString("en-IN")}
      {suffix}
    </span>
  );
}

export function HeroStats() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  return (
    <div
      className={`mt-10 flex items-center divide-x divide-black/15 transition-opacity duration-700 ${
        ready ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="pr-5 sm:pr-8">
        <p className="font-heading text-2xl sm:text-[32px] text-black">
          <CountUp target={50} duration={1800} delay={100} suffix="+" />
        </p>
        <p className="mt-0.5 text-xs text-black/60 font-medium">Trendy Styles</p>
      </div>

      <div className="px-5 sm:px-8">
        <p className="font-heading text-2xl sm:text-[32px] text-black">
          <CountUp target={100} duration={2000} delay={160} suffix="%" />
        </p>
        <p className="mt-0.5 text-xs text-black/60 font-medium">Quality Assured</p>
      </div>

      <div className="pl-5 sm:pl-8">
        <p className="font-heading text-2xl sm:text-[32px] text-black">
          <CountUp target={1000} duration={2200} delay={220} suffix="+" />
        </p>
        <p className="mt-0.5 text-xs text-black/60 font-medium">Happy Customers</p>
      </div>
    </div>
  );
}
