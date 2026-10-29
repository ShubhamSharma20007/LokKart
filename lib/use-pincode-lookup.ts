"use client";

import { useEffect, useState } from "react";

export type PincodeState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "found"; district: string; state: string; areas: string[] }
  | { status: "notfound" }
  | { status: "error" };

const IDLE_STATE: PincodeState = { status: "idle" };
const LOADING_STATE: PincodeState = { status: "loading" };

export function usePincodeLookup(pincode: string): PincodeState {
  const isValid = /^[1-9]\d{5}$/.test(pincode);
  const [result, setResult] = useState<{ pincode: string; state: PincodeState } | null>(null);

  useEffect(() => {
    if (!isValid) return;
    const ctrl = new AbortController();

    fetch(`/api/pincode/${pincode}`, { signal: ctrl.signal })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error();
        setResult({
          pincode,
          state: json.found
            ? { status: "found", district: json.district, state: json.state, areas: json.areas }
            : { status: "notfound" },
        });
      })
      .catch(() => {
        if (!ctrl.signal.aborted) {
          setResult({ pincode, state: { status: "error" } });
        }
      });

    return () => ctrl.abort();
  }, [isValid, pincode]);

  if (!isValid) {
    return IDLE_STATE;
  }

  if (!result || result.pincode !== pincode) {
    return LOADING_STATE;
  }

  return result.state;
}
