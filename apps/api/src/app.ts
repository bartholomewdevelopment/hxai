import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { apiRouter } from './routes/index';
import { errorHandler, notFoundHandler } from './middleware/error';
import { requestContext, requestLogger } from './middleware/requestContext';
import { globalRateLimit } from './middleware/rateLimit';

export function createApp(): Express {
  const app = express();

  // Trust one proxy hop so rate limiting and audit logs see real client IPs
  // behind a load balancer. Raise this if more hops are added.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      // The API serves JSON only; CSP belongs to whatever serves the frontend.
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use(
    cors({
      origin: env.CORS_ORIGINS,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id'],
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  app.use(requestContext);
  app.use(requestLogger);

  app.use('/api', globalRateLimit, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
