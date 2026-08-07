import type { UserRole } from '@historyai/shared';

declare global {
  namespace Express {
    interface Request {
      /** Correlation id, echoed in every error body and log line. */
      requestId: string;
      /** Populated by `authenticate`; absent on anonymous requests. */
      user?: {
        id: string;
        email: string;
        role: UserRole;
      };
    }
  }
}

export {};
