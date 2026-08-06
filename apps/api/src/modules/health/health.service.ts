import { APP_NAME, APP_VERSION } from '@longeviq/shared';
import { env } from '../../config/env.js';

export interface SystemStatus {
  status: 'ok';
  app: string;
  version: string;
  environment: string;
  timestamp: string;
  uptimeSeconds: number;
}

export class HealthService {
  check(): SystemStatus {
    return {
      status: 'ok',
      app: APP_NAME,
      version: APP_VERSION,
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
    };
  }
}
