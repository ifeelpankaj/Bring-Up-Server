
export interface DatabaseHealthStatus {
  status: 'healthy' | 'unhealthy';
  database: string;
  timestamp: Date;
  responseTime?: number;
  error?: string;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  database: {
    connected: boolean;
    latencyMs: number | null;
    name: string;
    host: string;
  }
}

export interface QueryMetrics {
  slowQueries: number;
  avgLatencyMs: number;
  totalQueries: number;
}