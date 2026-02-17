import { useEffect, useRef } from 'react';
import performanceMonitor from '../utils/performance/performanceMonitor';

/**
 * Custom hook for performance monitoring in React components
 * Automatically tracks component render times and lifecycle performance
 */
export const usePerformanceMonitor = (componentName) => {
  const renderStartRef = useRef(null);

  useEffect(() => {
    // Record render start time
    renderStartRef.current = performance.now();

    // Record render completion
    return () => {
      if (renderStartRef.current) {
        const renderTime = performance.now() - renderStartRef.current;
        performanceMonitor.startTimer(`${componentName}-render`);
        performanceMonitor.endTimer(`${componentName}-render`);
      }
    };
  }, [componentName]);

  return {
    startTimer: (operationName) => performanceMonitor.startTimer(`${componentName}-${operationName}`),
    endTimer: (operationName) => performanceMonitor.endTimer(`${componentName}-${operationName}`),
    getMetrics: (operationName) => performanceMonitor.getMetrics(`${componentName}-${operationName}`),
    getMemoryUsage: () => performanceMonitor.getMemoryUsage()
  };
};

export default usePerformanceMonitor;
