/**
 * Environment configuration tests
 * Tests that environment variables are properly loaded and validated
 */

import { env } from "../config/env";

describe("Environment Configuration", () => {
  describe("Server Configuration", () => {
    it("should have PORT configured", () => {
      expect(env.port).toBeDefined();
      expect(typeof env.port).toBe("number");
      expect(env.port).toBeGreaterThan(0);
    });

    it("should have NODE_ENV configured", () => {
      expect(env.nodeEnv).toBeDefined();
      expect(typeof env.nodeEnv).toBe("string");
    });

    it("should have CORS_ORIGIN configured", () => {
      expect(env.corsOrigin).toBeDefined();
      expect(typeof env.corsOrigin).toBe("string");
    });

    it("should have LOG_LEVEL configured", () => {
      expect(env.logLevel).toBeDefined();
      expect(typeof env.logLevel).toBe("string");
    });
  });

  describe("MongoDB Configuration", () => {
    it("should have MONGODB_URI configured", () => {
      expect(env.mongodbUri).toBeDefined();
      expect(typeof env.mongodbUri).toBe("string");
      expect(env.mongodbUri).toContain("mongodb");
    });

    it("should have correct MongoDB URI format", () => {
      expect(env.mongodbUri).toMatch(/^mongodb(\+srv)?:\/\/.+@.+\..+\/.+$/);
    });
  });

  describe("OpenAI Configuration", () => {
    it("should have OPENAI_API_KEY configured", () => {
      expect(env.openaiApiKey).toBeDefined();
      expect(typeof env.openaiApiKey).toBe("string");
      expect(env.openaiApiKey.length).toBeGreaterThan(0);
    });
  });

  describe("File Storage Configuration", () => {
    it("should have UPLOAD_DIR configured", () => {
      expect(env.uploadDir).toBeDefined();
      expect(typeof env.uploadDir).toBe("string");
    });

    it("should have MAX_FILE_SIZE configured", () => {
      expect(env.maxFileSize).toBeDefined();
      expect(typeof env.maxFileSize).toBe("number");
      expect(env.maxFileSize).toBeGreaterThan(0);
    });

    it("should have MAX_PROJECT_SIZE configured", () => {
      expect(env.maxProjectSize).toBeDefined();
      expect(typeof env.maxProjectSize).toBe("number");
      expect(env.maxProjectSize).toBeGreaterThan(0);
    });

    it("should have MAX_PROJECT_SIZE greater than MAX_FILE_SIZE", () => {
      expect(env.maxProjectSize).toBeGreaterThan(env.maxFileSize);
    });
  });
});
