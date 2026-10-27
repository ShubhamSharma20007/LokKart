"use client";

import { useEffect, useState } from "react";

export type CodEstimateData = {
  serviceable: true;
  courier: string;
  etaDays: number;
  shipping: number;
  codCharge: number;
  total: number;
};

export type CodState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "unserviceable" }
  | { status: "ok"; data: CodEstimateData };

// What the browser sends: ids and quantities only. The server reads price and
// packed size from the database.
export type CartLine = { id: string; qty: number };

const IDLE_STATE: CodState = { status: "idle" };
const LOADING_STATE: CodState = { status: "loading" };

export function useCodEstimate(pincode: string, lines: CartLine[], enabled = true): CodState {
  // A string, so the effect only re-runs when the cart really changes.
  const linesKey = JSON.stringify(lines.map((l) => [l.id, l.qty]));
  const isValid = enabled && /^[1-9]\d{5}$/.test(pincode) && lines.length > 0;
  const currentKey = isValid ? `${pincode}:${linesKey}` : "";

  const [result, setResult] = useState<{ key: string; state: CodState } | null>(null);

  useEffect(() => {
    if (!isValid) return;

    const ctrl = new AbortController();
    const items = (JSON.parse(linesKey) as [string, number][]).map(([id, qty]) => ({ id, qty }));

    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/shipping/cod-estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pincode, items }),
          signal: ctrl.signal,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Failed");
        setResult({
          key: currentKey,
          state: json.serviceable ? { status: "ok", data: json } : { status: "unserviceable" },
        });
      } catch (e) {
        if (ctrl.signal.aborted) return;
        setResult({
          key: currentKey,
          state: { status: "error", message: e instanceof Error ? e.message : "Failed" },
        });
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [isValid, currentKey, pincode, linesKey]);

  if (!isValid) {
    return IDLE_STATE;
  }

  if (!result || result.key !== currentKey) {
    return LOADING_STATE;
  }

  return result.state;
}