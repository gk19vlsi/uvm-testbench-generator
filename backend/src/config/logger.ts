/**
 * Winston logger configuration
 * Provides structured logging with different levels and formats
 */

import winston from "winston";
import { env } from "./env";

// Define log levels (including CRITICAL as highest priority)
const levels = {
  critical: 0,
  error: 1,
  warn: 2,
  info: 3,
  http: 4,
  debug: 5,
};

// Define colors for each level
const colors = {
  critical: "red bold",
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "blue",
};

// Tell winston about our colors
winston.addColors(colors);

// Define format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} [${info.level}]: ${info.message}`,
  ),
);

// Define format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

// Define which transports the logger must use
const transports: winston.transport[] = [
  // Console transport
  new winston.transports.Console({
    format: consoleFormat,
  }),
];

// Add file transports in production
if (env.nodeEnv === "production") {
  transports.push(
    // Error log file
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      format: fileFormat,
    }),
    // Combined log file
    new winston.transports.File({
      filename: "logs/combined.log",
      format: fileFormat,
    }),
  );
}

// Create the logger
const logger = winston.createLogger({
  level: env.logLevel,
  levels,
  transports,
  // Don't exit on handled exceptions
  exitOnError: false,
});

// Extend logger with critical method
interface ExtendedLogger extends winston.Logger {
  critical: (message: string, meta?: any) => void;
}

// Add critical logging method
(logger as ExtendedLogger).critical = (message: string, meta?: any) => {
  logger.log("critical", message, meta);
};

// Create a stream object for Morgan HTTP logging
export const stream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

export default logger as ExtendedLogger;
