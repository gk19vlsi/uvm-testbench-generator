/**
 * Request logging middleware
 * Logs HTTP requests with timing information
 */

import { Request, Response, NextFunction } from "express";
import logger from "../config/logger";

/**
 * Request logger middleware
 * Logs incoming requests and their response times
 */
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const startTime = Date.now();

  // Log when response finishes
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const message = `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`;

    if (res.statusCode >= 500) {
      logger.error(message);
    } else if (res.statusCode >= 400) {
      logger.warn(message);
    } else {
      logger.http(message);
    }
  });

  next();
};
