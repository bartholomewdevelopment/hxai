import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler';
import { checkDatabaseConnection } from '../db/client';
import { env } from '../config/env';

export const healthRouter: Router = Router();

healthRouter.get(
  '/health',
  asyncHandler(async (req, res) => {
    const databaseOk = await checkDatabaseConnection();

    res.status(databaseOk ? 200 : 503).json({
      status: databaseOk ? 'ok' : 'degraded',
      version: '0.1.0',
      phase: 1,
      environment: env.NODE_ENV,
      requestId: req.requestId,
      checks: { database: databaseOk ? 'ok' : 'unreachable' },
      providers: {
        llm: env.LLM_PROVIDER,
        embedding: env.EMBEDDING_PROVIDER,
        reranking: env.RERANKING_PROVIDER,
        storage: env.STORAGE_PROVIDER,
      },
      timestamp: new Date().toISOString(),
    });
  }),
);
