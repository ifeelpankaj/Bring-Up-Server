import { Injectable, Inject } from '@nestjs/common';
import { AppLogger } from '@bringup/logger';
import { FIRESTORE_TOKEN, HealthStatus, QueryMetrics } from '@bringup/shared';
import { Firestore } from 'firebase-admin/firestore';

@Injectable()
export class DatabaseHealthService {
  private queryMetrics = {
    slowQueries: 0,
    totalLatency: 0,
    totalQueries: 0,
  };

  private readonly SLOW_QUERY_THRESHOLD_MS = 1000;

  constructor(
    @Inject(FIRESTORE_TOKEN) private readonly firestore: Firestore,
    private readonly logger: AppLogger,
  ) {
    this.logger.forContext('DatabaseHealth');
  }

  async checkHealth(): Promise<HealthStatus> {

    let isConnected = false;
    let latencyMs: number | null = null;

    try {
      const start = Date.now();
      // Perform a simple read operation to check connectivity
      await this.firestore.collection('_health_check').limit(1).get();
      latencyMs = Date.now() - start;
      isConnected = true;

      // Log if ping is slow
      if (latencyMs > 500) {
        this.logger.warn(`Firestore health check slow: ${latencyMs}ms`);
      }
    } catch (error) {
      this.logger.error('Firestore health check failed', error as Error);
      isConnected = false;
    }

    const status = this.resolveStatus(isConnected, latencyMs);

    return {
      status,
      database: {
        connected: isConnected,
        latencyMs,
        name: 'firestore',
        host: 'firestore.googleapis.com',
      }
    };
  }

  getQueryMetrics(): QueryMetrics {
    return {
      slowQueries: this.queryMetrics.slowQueries,
      avgLatencyMs:
        this.queryMetrics.totalQueries > 0
          ? Math.round(
              this.queryMetrics.totalLatency / this.queryMetrics.totalQueries,
            )
          : 0,
      totalQueries: this.queryMetrics.totalQueries,
    };
  }

  // Call this method to track query metrics from your services
  trackQuery(latencyMs: number): void {
    this.queryMetrics.totalQueries++;
    this.queryMetrics.totalLatency += latencyMs;

    if (latencyMs > this.SLOW_QUERY_THRESHOLD_MS) {
      this.queryMetrics.slowQueries++;
      this.logger.warn(`Slow Firestore query detected: ${latencyMs}ms`);
    }
  }

  private resolveStatus(
    connected: boolean,
    latencyMs: number | null,
  ): 'healthy' | 'degraded' | 'unhealthy' {
    if (!connected) return 'unhealthy';
    if (latencyMs && latencyMs > 1000) return 'degraded';
    return 'healthy';
  }
}
