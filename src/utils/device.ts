import { useState, useEffect } from 'react';

/**
 * Device and screen size utilities for responsive design
 */

export interface ScreenSize {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  orientation: 'portrait' | 'landscape';
}

export function getScreenSize(): ScreenSize {
  const width = window.innerWidth;
  const height = window.innerHeight;
  
  return {
    width,
    height,
    isMobile: width < 768,
    isTablet: width >= 768 && width < 1024,
    isDesktop: width >= 1024,
    orientation: height > width ? 'portrait' : 'landscape',
  };
}

export function useResponsive() {
  const [screenSize, setScreenSize] = useState<ScreenSize>(getScreenSize());

  useEffect(() => {
    const handleResize = () => {
      setScreenSize(getScreenSize());
    };

    // Debounce resize events for better performance
    let timeoutId: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 150);
    };

    window.addEventListener('resize', debouncedResize);
    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(timeoutId);
    };
  }, []);

  return screenSize;
}

// Responsive breakpoints (matching Tailwind CSS)
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

// Responsive grid utilities
export function getResponsiveColumns(screenWidth: number): number {
  if (screenWidth < breakpoints.sm) return 1;
  if (screenWidth < breakpoints.md) return 2;
  if (screenWidth < breakpoints.lg) return 3;
  if (screenWidth < breakpoints.xl) return 4;
  return 5;
}

// Responsive spacing utilities
export function getResponsiveSpacing(screenWidth: number): {
  padding: string;
  margin: string;
  gap: string;
} {
  if (screenWidth < breakpoints.sm) {
    return {
      padding: 'p-3',
      margin: 'm-2',
      gap: 'gap-2',
    };
  }
  if (screenWidth < breakpoints.md) {
    return {
      padding: 'p-4',
      margin: 'm-3',
      gap: 'gap-3',
    };
  }
  return {
    padding: 'p-6',
    margin: 'm-4',
    gap: 'gap-4',
  };
}

// Safe area utilities for mobile devices
export function getSafeAreaInsets() {
  const style = getComputedStyle(document.documentElement);
  return {
    top: style.getPropertyValue('--sat') || '0px',
    right: style.getPropertyValue('--sar') || '0px',
    bottom: style.getPropertyValue('--sab') || '0px',
    left: style.getPropertyValue('--sal') || '0px',
  };
}

// Viewport height utilities (handling mobile browser address bar)
export function getViewportHeight(): number {
  return window.visualViewport?.height || window.innerHeight;
}

// Touch device detection
export function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

// Device orientation utilities
export function getOrientation(): 'portrait' | 'landscape' {
  return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
}

// Performance-optimized media query hook
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

// Common responsive hooks
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)');
}

export function useIsTablet(): boolean {
  return useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
}

export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}