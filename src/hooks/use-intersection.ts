"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

interface UseIntersectionOptions extends IntersectionObserverInit {
  triggerOnce?: boolean;
}

interface UseIntersectionReturn<T extends HTMLElement> {
  ref: RefObject<T>;
  isIntersecting: boolean;
  entry: IntersectionObserverEntry | null;
}

export function useIntersection<T extends HTMLElement = HTMLDivElement>(
  options: UseIntersectionOptions = {}
): UseIntersectionReturn<T> {
  const { triggerOnce = true, ...observerOptions } = options;
  const ref = useRef<T>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([observerEntry]) => {
        setEntry(observerEntry);
        setIsIntersecting(observerEntry.isIntersecting);

        if (triggerOnce && observerEntry.isIntersecting) {
          observer.unobserve(element);
        }
      },
      observerOptions
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [triggerOnce, observerOptions.threshold, observerOptions.rootMargin]);

  return { ref, isIntersecting, entry };
}
