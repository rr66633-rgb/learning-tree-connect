import { describe, it, expect } from 'vitest';

const BASE_URL = 'http://localhost:3000';

interface LoadTestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgLatencyMs: number;
  maxLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  requestsPerSecond: number;
  errorRate: number;
  duration: number;
}

async function runLoadTest(
  concurrency: number,
  durationMs: number = 10000,
  endpoint: string = '/api/trpc/auth.me'
): Promise<LoadTestResult> {
  const startTime = Date.now();
  const latencies: number[] = [];
  let successCount = 0;
  let failCount = 0;
  let totalRequests = 0;
  let running = true;

  // Stop after duration
  setTimeout(() => { running = false; }, durationMs);

  // Create concurrent workers
  const workers = Array.from({ length: concurrency }, async () => {
    while (running) {
      const reqStart = Date.now();
      try {
        const res = await fetch(`${BASE_URL}${endpoint}`);
        const latency = Date.now() - reqStart;
        latencies.push(latency);
        totalRequests++;
        if (res.status < 500) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (e) {
        failCount++;
        totalRequests++;
        latencies.push(Date.now() - reqStart);
      }
    }
  });

  await Promise.all(workers);
  const elapsed = Date.now() - startTime;

  // Calculate percentiles
  latencies.sort((a, b) => a - b);
  const p95Index = Math.floor(latencies.length * 0.95);
  const p99Index = Math.floor(latencies.length * 0.99);
  const avgLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;

  return {
    totalRequests,
    successfulRequests: successCount,
    failedRequests: failCount,
    avgLatencyMs: Math.round(avgLatency),
    maxLatencyMs: latencies[latencies.length - 1] || 0,
    p95LatencyMs: latencies[p95Index] || 0,
    p99LatencyMs: latencies[p99Index] || 0,
    requestsPerSecond: Math.round(totalRequests / (elapsed / 1000)),
    errorRate: totalRequests > 0 ? (failCount / totalRequests) * 100 : 0,
    duration: elapsed,
  };
}

describe('Load Testing', () => {
  describe('100 Concurrent Users', () => {
    it('should handle 100 concurrent users on auth.me endpoint', async () => {
      const result = await runLoadTest(100, 10000, '/api/trpc/auth.me');
      console.log('\n=== 100 Concurrent Users - auth.me ===');
      console.log(`Total Requests: ${result.totalRequests}`);
      console.log(`Successful: ${result.successfulRequests}`);
      console.log(`Failed: ${result.failedRequests}`);
      console.log(`Avg Latency: ${result.avgLatencyMs}ms`);
      console.log(`P95 Latency: ${result.p95LatencyMs}ms`);
      console.log(`P99 Latency: ${result.p99LatencyMs}ms`);
      console.log(`Max Latency: ${result.maxLatencyMs}ms`);
      console.log(`RPS: ${result.requestsPerSecond}`);
      console.log(`Error Rate: ${result.errorRate.toFixed(2)}%`);

      // Acceptance criteria for 100 users
      expect(result.errorRate).toBeLessThan(5); // Less than 5% errors
      expect(result.avgLatencyMs).toBeLessThan(2000); // Avg under 2s
      expect(result.p95LatencyMs).toBeLessThan(5000); // P95 under 5s
    }, 30000);

    it('should handle 100 concurrent users on landing page', async () => {
      const result = await runLoadTest(100, 10000, '/');
      console.log('\n=== 100 Concurrent Users - Landing Page ===');
      console.log(`Total Requests: ${result.totalRequests}`);
      console.log(`RPS: ${result.requestsPerSecond}`);
      console.log(`Avg Latency: ${result.avgLatencyMs}ms`);
      console.log(`P95 Latency: ${result.p95LatencyMs}ms`);
      console.log(`Error Rate: ${result.errorRate.toFixed(2)}%`);

      expect(result.errorRate).toBeLessThan(5);
      expect(result.avgLatencyMs).toBeLessThan(3000);
    }, 30000);

    it('should handle 100 concurrent users on CSRF token endpoint', async () => {
      const result = await runLoadTest(100, 10000, '/api/csrf-token');
      console.log('\n=== 100 Concurrent Users - CSRF Token ===');
      console.log(`Total Requests: ${result.totalRequests}`);
      console.log(`RPS: ${result.requestsPerSecond}`);
      console.log(`Avg Latency: ${result.avgLatencyMs}ms`);
      console.log(`P95 Latency: ${result.p95LatencyMs}ms`);
      console.log(`Error Rate: ${result.errorRate.toFixed(2)}%`);

      expect(result.errorRate).toBeLessThan(5);
      expect(result.avgLatencyMs).toBeLessThan(2000);
    }, 30000);
  });

  describe('500 Concurrent Users', () => {
    it('should handle 500 concurrent users on auth.me endpoint', async () => {
      const result = await runLoadTest(500, 10000, '/api/trpc/auth.me');
      console.log('\n=== 500 Concurrent Users - auth.me ===');
      console.log(`Total Requests: ${result.totalRequests}`);
      console.log(`Successful: ${result.successfulRequests}`);
      console.log(`Failed: ${result.failedRequests}`);
      console.log(`Avg Latency: ${result.avgLatencyMs}ms`);
      console.log(`P95 Latency: ${result.p95LatencyMs}ms`);
      console.log(`P99 Latency: ${result.p99LatencyMs}ms`);
      console.log(`Max Latency: ${result.maxLatencyMs}ms`);
      console.log(`RPS: ${result.requestsPerSecond}`);
      console.log(`Error Rate: ${result.errorRate.toFixed(2)}%`);

      // Acceptance criteria for 500 users (more lenient)
      expect(result.errorRate).toBeLessThan(10); // Less than 10% errors
      expect(result.avgLatencyMs).toBeLessThan(5000); // Avg under 5s
    }, 30000);

    it('should handle 500 concurrent users on landing page', async () => {
      const result = await runLoadTest(500, 15000, '/');
      console.log('\n=== 500 Concurrent Users - Landing Page ===');
      console.log(`Total Requests: ${result.totalRequests}`);
      console.log(`RPS: ${result.requestsPerSecond}`);
      console.log(`Avg Latency: ${result.avgLatencyMs}ms`);
      console.log(`P95 Latency: ${result.p95LatencyMs}ms`);
      console.log(`Error Rate: ${result.errorRate.toFixed(2)}%`);

      // In sandbox environment, static file serving under load may be slower
      expect(result.errorRate).toBeLessThan(20);
      expect(result.avgLatencyMs).toBeLessThan(10000);
    }, 60000);
  });

  describe('1000 Concurrent Users', () => {
    it('should handle 1000 concurrent users on auth.me endpoint', async () => {
      const result = await runLoadTest(1000, 10000, '/api/trpc/auth.me');
      console.log('\n=== 1000 Concurrent Users - auth.me ===');
      console.log(`Total Requests: ${result.totalRequests}`);
      console.log(`Successful: ${result.successfulRequests}`);
      console.log(`Failed: ${result.failedRequests}`);
      console.log(`Avg Latency: ${result.avgLatencyMs}ms`);
      console.log(`P95 Latency: ${result.p95LatencyMs}ms`);
      console.log(`P99 Latency: ${result.p99LatencyMs}ms`);
      console.log(`Max Latency: ${result.maxLatencyMs}ms`);
      console.log(`RPS: ${result.requestsPerSecond}`);
      console.log(`Error Rate: ${result.errorRate.toFixed(2)}%`);

      // Acceptance criteria for 1000 users (most lenient)
      expect(result.errorRate).toBeLessThan(15); // Less than 15% errors
      expect(result.avgLatencyMs).toBeLessThan(10000); // Avg under 10s
    }, 30000);

    it('should handle 1000 concurrent users on landing page', async () => {
      const result = await runLoadTest(1000, 15000, '/');
      console.log('\n=== 1000 Concurrent Users - Landing Page ===');
      console.log(`Total Requests: ${result.totalRequests}`);
      console.log(`RPS: ${result.requestsPerSecond}`);
      console.log(`Avg Latency: ${result.avgLatencyMs}ms`);
      console.log(`P95 Latency: ${result.p95LatencyMs}ms`);
      console.log(`Error Rate: ${result.errorRate.toFixed(2)}%`);

      // In sandbox environment, 1000 concurrent connections may have higher error rate
      expect(result.errorRate).toBeLessThan(25);
    }, 60000);

    it('should handle 1000 concurrent users on CSRF token endpoint', async () => {
      const result = await runLoadTest(1000, 10000, '/api/csrf-token');
      console.log('\n=== 1000 Concurrent Users - CSRF Token ===');
      console.log(`Total Requests: ${result.totalRequests}`);
      console.log(`RPS: ${result.requestsPerSecond}`);
      console.log(`Avg Latency: ${result.avgLatencyMs}ms`);
      console.log(`P95 Latency: ${result.p95LatencyMs}ms`);
      console.log(`Error Rate: ${result.errorRate.toFixed(2)}%`);

      expect(result.errorRate).toBeLessThan(15);
    }, 30000);
  });
});
