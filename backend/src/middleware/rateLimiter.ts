import { Request, Response, NextFunction } from "express";
import { logger } from "../config/logger";

/**
 * Rate limiting middleware
 * Implements token bucket algorithm for rate limiting
 */

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string; // Custom error message
}

interface RateLimitEntry {
  tokens: number;
  lastRefill: number;
}

// In-memory store for rate limiting
// In production, use Redis for distributed rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Create rate limiter middleware
 */
export function createRateLimiter(config: RateLimitConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = getRateLimitKey(req);
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    if (!entry) {
      // First request from this key
      entry = {
        tokens: config.maxRequests - 1,
        lastRefill: now,
      };
      rateLimitStore.set(key, entry);
      return next();
    }

    // Calculate tokens to add based on time elapsed
    const timeSinceLastRefill = now - entry.lastRefill;
    const tokensToAdd =
      Math.floor(timeSinceLastRefill / config.windowMs) * config.maxRequests;

    if (tokensToAdd > 0) {
      entry.tokens = Math.min(config.maxRequests, entry.tokens + tokensToAdd);
      entry.lastRefill = now;
    }

    if (entry.tokens > 0) {
      entry.tokens--;
      rateLimitStore.set(key, entry);

      // Add rate limit headers
      res.setHeader("X-RateLimit-Limit", config.maxRequests);
      res.setHeader("X-RateLimit-Remaining", entry.tokens);
      res.setHeader(
        "X-RateLimit-Reset",
        new Date(entry.lastRefill + config.windowMs).toISOString(),
      );

      return next();
    }

    // Rate limit exceeded
    logger.warn("Rate limit exceeded", {
      ip: req.ip,
      key,
      path: req.path,
    });

    res.setHeader("X-RateLimit-Limit", config.maxRequests);
    res.setHeader("X-RateLimit-Remaining", 0);
    res.setHeader(
      "X-RateLimit-Reset",
      new Date(entry.lastRefill + config.windowMs).toISOString(),
    );
    res.setHeader(
      "Retry-After",
      Math.ceil((entry.lastRefill + config.windowMs - now) / 1000),
    );

    return res.status(429).json({
      error: config.message || "Too many requests, please try again later",
      retryAfter: Math.ceil((entry.lastRefill + config.windowMs - now) / 1000),
    });
  };
}

/**
 * Get rate limit key from request
 * Uses IP address and user identifier if available
 */
function getRateLimitKey(req: Request): string {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const projectId = req.params.projectId || req.body.projectId;

  if (projectId) {
    return `${ip}:${projectId}`;
  }

  return ip;
}

/**
 * Clean up old entries from rate limit store
 * Should be called periodically
 */
export function cleanupRateLimitStore(maxAge: number = 3600000) {
  const now = Date.now();
  const keysToDelete: string[] = [];

  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.lastRefill > maxAge) {
      keysToDelete.push(key);
    }
  }

  for (const key of keysToDelete) {
    rateLimitStore.delete(key);
  }

  logger.debug(`Cleaned up ${keysToDelete.length} rate limit entries`);
}

/**
 * Rate limiters for different endpoints
 */

// File upload: 10 uploads per minute
export const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
  message: "Too many file uploads, please try again in a minute",
});

// Generation: 5 generations per hour
export const generationRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 5,
  message: "Too many generation requests, please try again in an hour",
});

// API general: 100 requests per minute
export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
  message: "Too many requests, please slow down",
});

// LLM configuration: 10 requests per minute
export const llmConfigRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
  message: "Too many LLM configuration requests, please try again in a minute",
});

// Start cleanup interval (every 10 minutes)
setInterval(
  () => {
    cleanupRateLimitStore();
  },
  10 * 60 * 1000,
);
