import { Router } from 'express';
import { healthRouter } from './health';
import { authRouter } from './auth';
import { peopleRouter } from './people';
import { sourcesRouter } from './sources';
import { conversationsRouter } from './conversations';
import { adminRouter } from './admin';

export const apiRouter: Router = Router();

apiRouter.use(healthRouter);
apiRouter.use(authRouter);
apiRouter.use(peopleRouter);
apiRouter.use(sourcesRouter);
apiRouter.use(conversationsRouter);
apiRouter.use(adminRouter);
