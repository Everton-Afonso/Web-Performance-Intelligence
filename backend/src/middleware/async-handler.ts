import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Wraps async route handlers so rejected promises reach the error handler
 * (Express 4 does not catch async rejections automatically).
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}