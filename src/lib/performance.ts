/**
 * Performance monitoring utilities
 */

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 100;

  /**
   * Measure execution time of a function
   */
  async measure<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.recordMetric(name, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordMetric(`${name}_error`, duration);
      throw error;
    }
  }

  /**
   * Record a performance metric
   */
  recordMetric(name: string, value: number): void {
    this.metrics.push({
      name,
      value,
      timestamp: Date.now(),
    });

    // Keep only last N metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // Log in development
    if (import.meta.env.DEV) {
      console.log(`[Performance] ${name}: ${value.toFixed(2)}ms`);
    }

    // Send to analytics in production
    if (import.meta.env.PROD && value > 1000) {
      // Log slow operations (>1s)
      // TODO: Send to analytics service
      console.warn(`[Performance] Slow operation detected: ${name} took ${value.toFixed(2)}ms`);
    }
  }

  /**
   * Get average time for a metric
   */
  getAverage(name: string): number {
    const relevant = this.metrics.filter(m => m.name === name);
    if (relevant.length === 0) return 0;
    const sum = relevant.reduce((acc, m) => acc + m.value, 0);
    return sum / relevant.length;
  }

  /**
   * Get all metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }
}

export const performanceMonitor = new PerformanceMonitor();

/**
 * React hook for measuring component render time
 * 
 * Usage in a component:
 * ```tsx
 * import { useEffect } from 'react';
 * import { usePerformanceMeasure } from '@/lib/performance';
 * 
 * function MyComponent() {
 *   useEffect(() => {
 *     const cleanup = usePerformanceMeasure('MyComponent');
 *     return cleanup;
 *   }, []);
 *   // ...
 * }
 * ```
 */
export function usePerformanceMeasure(componentName: string): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const start = performance.now();
  return () => {
    const duration = performance.now() - start;
    performanceMonitor.recordMetric(`render_${componentName}`, duration);
  };
}

/**
 * Measure bundle size (client-side only)
 */
export function measureBundleSize(): void {
  if (typeof window === 'undefined' || !import.meta.env.DEV) return;

  if ('performance' in window && 'getEntriesByType' in performance) {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const scripts = resources.filter(r => r.initiatorType === 'script');
    const totalSize = scripts.reduce((acc, s) => {
      const resource = s as PerformanceResourceTiming & { transferSize?: number };
      const size = resource.transferSize || 0;
      return acc + size;
    }, 0);

    console.log(`[Bundle] Total script size: ${(totalSize / 1024).toFixed(2)} KB`);
  }
}

