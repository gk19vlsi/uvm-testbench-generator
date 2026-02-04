/**
 * Middleware tests
 * Tests error handling and request logging middleware
 */

import request from "supertest";
import express, { Request, Response, NextFunction } from "express";
import {
  errorHandler,
  AppError,
  asyncHandler,
} from "../middleware/errorHandler";
import { requestLogger } from "../middleware/requestLogger";

describe("Middleware", () => {
  describe("Error Handler", () => {
    let app: express.Application;

    beforeEach(() => {
      app = express();
      app.use(express.json());
    });

    it("should handle AppError with custom status code", async () => {
      app.get("/test", (req, res, next) => {
        next(new AppError("Custom error", 400));
      });
      app.use(errorHandler);

      const response = await request(app).get("/test");

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Custom error");
    });

    it("should handle generic errors with 500 status", async () => {
      app.get("/test", (req, res, next) => {
        next(new Error("Generic error"));
      });
      app.use(errorHandler);

      const response = await request(app).get("/test");

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("error");
    });

    it("should handle validation errors with 400 status", async () => {
      app.get("/test", (req, res, next) => {
        const error = new Error("Validation failed");
        error.name = "ValidationError";
        next(error);
      });
      app.use(errorHandler);

      const response = await request(app).get("/test");

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("Async Handler", () => {
    let app: express.Application;

    beforeEach(() => {
      app = express();
      app.use(express.json());
    });

    it("should catch errors in async route handlers", async () => {
      app.get(
        "/test",
        asyncHandler(async (req, res, next) => {
          throw new AppError("Async error", 400);
        }),
      );
      app.use(errorHandler);

      const response = await request(app).get("/test");

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Async error");
    });

    it("should handle successful async routes", async () => {
      app.get(
        "/test",
        asyncHandler(async (req, res, next) => {
          res.json({ success: true });
        }),
      );

      const response = await request(app).get("/test");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
    });
  });

  describe("Request Logger", () => {
    let app: express.Application;

    beforeEach(() => {
      app = express();
      app.use(requestLogger);
    });

    it("should log requests without errors", async () => {
      app.get("/test", (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app).get("/test");

      expect(response.status).toBe(200);
      // Logger should not throw errors
    });

    it("should log requests with errors", async () => {
      app.get("/test", (req, res) => {
        res.status(500).json({ error: "Server error" });
      });

      const response = await request(app).get("/test");

      expect(response.status).toBe(500);
      // Logger should not throw errors
    });
  });
});
