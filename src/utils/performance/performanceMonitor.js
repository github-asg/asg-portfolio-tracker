/**
 * Performance Monitoring Utility
 * Tracks timing measurements and resource usage for critical operations
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {};
    this.timers = {};
  }

  /**
   * Start timing a critical operation
   */
  startTimer(operationName) {
    this.timers[operationName] = performance.now();
  }

  /**
   * End timing and record the duration
   */
  endTimer(operationName) {
    if (!this.timers[operationName]) {
      console.warn(`Timer for ${operationName} was not started`);
      return null;
    }

    const duration = performance.now() - this.timers[operationName];
    delete this.timers[operationName];

    if (!this.metrics[operationName]) {
      this.metrics[operationName] = {
        count: 0,
        totalTime: 0,
        minTime: Infinity,
        maxTime: -Infinity,
        avgTime: 0
      };
    }

    const metric = this.metrics[operationName];
    metric.count++;
    metric.totalTime += duration;
    metric.minTime = Math.min(metric.minTime, duration);
    metric.maxTime = Math.max(metric.maxTime, duration);
    metric.avgTime = metric.totalTime / metric.count;

    return duration;
  }

  /**
   * Get metrics for a specific operation
   */
  getMetrics(operationName) {
    return this.metrics[operationName] || null;
  }

  /**
   * Get all metrics
   */
  getAllMetrics() {
    return { ...this.metrics };
  }

  /**
   * Reset metrics for a specific operation
   */
  resetMetrics(operationName) {
    delete this.metrics[operationName];
  }

  /**
   * Reset all metrics
   */
  resetAllMetrics() {
    this.metrics = {};
  }

  /**
   * Get memory usage (if available)
   */
  getMemoryUsage() {
    if (performance.memory) {
      return {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
        percentageUsed: (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100
      };
    }
    return null;
  }

  /**
   * Log performance summary
   */
  logSummary() {
    console.group('Performance Metrics Summary');
    Object.entries(this.metrics).forEach(([operation, metric]) => {
      console.log(`${operation}:`, {
        count: metric.count,
        avgTime: `${metric.avgTime.toFixed(2)}ms`,
        minTime: `${metric.minTime.toFixed(2)}ms`,
        maxTime: `${metric.maxTime.toFixed(2)}ms`,
        totalTime: `${metric.totalTime.toFixed(2)}ms`
      });
    });

    const memory = this.getMemoryUsage();
    if (memory) {
      console.log('Memory Usage:', {
        used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
        total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
        limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`,
        percentage: `${memory.percentageUsed.toFixed(2)}%`
      });
    }
    console.groupEnd();
  }

  /**
   * Create a performance benchmark
   */
  benchmark(operationName, fn, iterations = 1) {
    const results = [];
    for (let i = 0; i < iterations; i++) {
      this.startTimer(operationName);
      fn();
      const duration = this.endTimer(operationName);
      results.push(duration);
    }
    return results;
  }
}

// Export singleton instance
export default new PerformanceMonitor();
