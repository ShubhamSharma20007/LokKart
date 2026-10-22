"use client";

import { useSyncExternalStore } from "react";

function emptySubscribe(): () => void {
  return () => {};
}

export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
