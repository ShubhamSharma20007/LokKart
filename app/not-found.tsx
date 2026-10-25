"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();
  const [timer, setTimer] = useState(5);

  useEffect(() => {
    if (timer <= 1) {
      router.replace("/");
    }
  }, [timer, router]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <main className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-muted-foreground">Page not found. Taking you home({timer})...</p>
      <Link href="/" className="mt-4 inline-block text-primary underline underline-offset-4">
        Go to home page
      </Link>
    </main>
  );
}