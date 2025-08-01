import { useQuery } from 'convex/react';
import { useMemo, useRef, useEffect, useState } from 'react';

/**
 * Optimized query hook that implements selective updates and data diffing
 * to reduce unnecessary re-renders when data hasn't meaningfully changed
 */
export function useOptimizedQuery<Query extends any>(
  query: Query,
  args: any,
  options?: {
    // Only update if specific fields have changed
    selectiveFields?: string[];
    // Custom comparison function
    isEqual?: (prev: any, next: any) => boolean;
    // Debounce updates (in ms)
    debounce?: number;
  }
) {
  const rawData = useQuery(query, args);
  const previousDataRef = useRef<any>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { selectiveFields, isEqual, debounce = 0 } = options || {};

  // Memoized data with selective updates
  const optimizedData = useMemo(() => {
    if (!rawData) return rawData;

    const previousData = previousDataRef.current;
    
    // First load
    if (!previousData) {
      previousDataRef.current = rawData;
      return rawData;
    }

    // Custom equality check
    if (isEqual && isEqual(previousData, rawData)) {
      return previousData;
    }

    // Selective field comparison
    if (selectiveFields && selectiveFields.length > 0) {
      const hasChanges = selectiveFields.some(field => {
        const prevValue = getNestedValue(previousData, field);
        const nextValue = getNestedValue(rawData, field);
        return !deepEqual(prevValue, nextValue);
      });

      if (!hasChanges) {
        return previousData;
      }
    }

    // Default deep equality check
    if (deepEqual(previousData, rawData)) {
      return previousData;
    }

    previousDataRef.current = rawData;
    return rawData;
  }, [rawData, selectiveFields, isEqual]);

  // Debounced updates
  const [debouncedData, setDebouncedData] = useState(optimizedData);

  useEffect(() => {
    if (debounce > 0) {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      debounceTimeoutRef.current = setTimeout(() => {
        setDebouncedData(optimizedData);
        debounceTimeoutRef.current = null;
      }, debounce);
    } else {
      setDebouncedData(optimizedData);
    }
  }, [optimizedData, debounce]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
    };
  }, []);

  return debounce > 0 ? debouncedData : optimizedData;
}

// Helper function to get nested object values
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

// Deep equality check with performance optimizations and circular reference protection
function deepEqual(a: any, b: any, visited = new WeakSet()): boolean {
  if (a === b) return true;
  
  if (a == null || b == null) return a === b;
  
  if (typeof a !== typeof b) return false;
  
  if (typeof a !== 'object') return a === b;
  
  // Handle Date objects
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }
  
  // Prevent circular reference issues
  if (visited.has(a) || visited.has(b)) return a === b;
  visited.add(a);
  visited.add(b);
  
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i], visited)) return false;
    }
    return true;
  }
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (!(key in b)) return false;
    if (!deepEqual(a[key], b[key], visited)) return false;
  }
  
  return true;
}