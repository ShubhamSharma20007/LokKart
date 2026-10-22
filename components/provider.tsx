"use client";

import { useEffect, useState } from "react";
import { Provider } from "react-redux";
import { AuthProvider } from "@/components/auth-provider";
import { hydrate } from "@/lib/store/slices/cartSlice";
import { makeStore } from "@/lib/store/store";
import { ThemeProvider } from "next-themes";

const KEY = "bachatnix-cart";

export function Providers({ children }: { children: React.ReactNode }) {
  const [store] = useState(makeStore);

  useEffect(() => {
    // Load the saved cart after mount so server and client HTML match.
    try {
      const raw = localStorage.getItem(KEY);
      const saved = raw ? JSON.parse(raw) : [];
      store.dispatch(hydrate(Array.isArray(saved) ? saved : []));
    } catch {
      store.dispatch(hydrate([]));
    }

    let prev = store.getState().cart.items;
    return store.subscribe(() => {
      const { items, hydrated } = store.getState().cart;
      if (!hydrated || items === prev) return;
      prev = items;
      try {
        localStorage.setItem(KEY, JSON.stringify(items));
      } catch {}
    });
  }, [store]);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <Provider store={store}>
        <AuthProvider>{children}</AuthProvider>
      </Provider>
    </ThemeProvider>
  );
}