import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { trackPageView, trackViewContent } from "@/lib/metaPixel";

/**
 * Hook to track Meta Pixel PageView events on every route change.
 * Should be called once at the top-level App component.
 */
export function useMetaPixelPageView(): void {
  const [location] = useLocation();
  const prevLocation = useRef(location);

  useEffect(() => {
    // Skip the initial page load (already tracked by the inline script in index.html)
    if (prevLocation.current !== location) {
      trackPageView();
      prevLocation.current = location;
    }
  }, [location]);
}

/**
 * Hook to track ViewContent for specific pages.
 * Call this in page components that represent key content.
 */
export function useTrackViewContent(
  contentName: string,
  contentCategory?: string
): void {
  useEffect(() => {
    trackViewContent(contentName, contentCategory);
  }, [contentName, contentCategory]);
}
