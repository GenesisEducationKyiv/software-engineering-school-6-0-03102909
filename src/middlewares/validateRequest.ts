import type { Request, Response, NextFunction } from 'express';
import type { ZodType } from 'zod';
import { ZodError } from 'zod';

export const validateRequest =
  (schema: ZodType) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = (await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      })) as Record<string, unknown>;

      if (parsed['body']) req.body = parsed['body'];

      next();
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Bad Request',
          details: error.issues.map((issue) => issue.message),
        });
        return;
      }

      next(error);
    }
  };
