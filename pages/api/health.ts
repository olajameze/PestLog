import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../lib/prisma';

type HealthResponse = {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  database: {
    connected: boolean;
    latency: number;
    error?: string;
  };
  environment: {
    node_env: string;
    database_url_set: boolean;
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthResponse>
) {
  const startTime = Date.now();

  try {
    // Test database connection
    const result = await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - startTime;

    return res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        latency,
      },
      environment: {
        node_env: process.env.NODE_ENV || 'unknown',
        database_url_set: !!process.env.DATABASE_URL,
      },
    });
  } catch (error) {
    const latency = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    return res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: false,
        latency,
        error: errorMessage,
      },
      environment: {
        node_env: process.env.NODE_ENV || 'unknown',
        database_url_set: !!process.env.DATABASE_URL,
      },
    });
  }
}
