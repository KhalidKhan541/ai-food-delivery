"use client";

import { useRef } from "react";

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  const currentRef = useRef<T>(value);

  if (currentRef.current !== value) {
    ref.current = currentRef.current;
    currentRef.current = value;
  }

  return ref.current;
}
