import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { logger } from '../config/logger';

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      req.body = parsed.body;
      req.query = parsed.query;
      req.params = parsed.params;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        logger.warn('Validation error', { errors: err.errors, path: req.path });
        
        // Group errors by field name
        const fields: Record<string, string[]> = {};
        err.errors.forEach(e => {
          const fieldPath = e.path.slice(1).join('.') || 'body'; // slice off 'body' / 'query' / 'params'
          if (!fields[fieldPath]) {
            fields[fieldPath] = [];
          }
          fields[fieldPath].push(e.message);
        });

        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            fields
          }
        });
        return;
      }
      next(err);
    }
  };
};
