/**
 * Basic server tests
 * Tests server initialization and basic endpoints
 */

import request from "supertest";
import { app } from "../index";
import { dbManager } from "../config/database";

describe("Server", () => {
  beforeAll(async () => {
    await dbManager.connect();
  });

  afterAll(async () => {
    await dbManager.disconnect();
  });

  describe("GET /health", () => {
    it("should return health status", async () => {
      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("status", "ok");
      expect(response.body).toHaveProperty("timestamp");
      expect(response.body).toHaveProperty("environment");
      expect(response.body).toHaveProperty("version");
    });
  });

  describe("GET /api", () => {
    it("should return API information", async () => {
      const response = await request(app).get("/api");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("message");
      expect(response.body).toHaveProperty("version");
      expect(response.body).toHaveProperty("endpoints");
    });
  });

  describe("GET /nonexistent", () => {
    it("should return 404 for unknown routes", async () => {
      const response = await request(app).get("/nonexistent");

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
    });
  });
});
