/**
 * Database connection tests
 */

import { dbManager } from "../config/database";

describe("Database Manager", () => {
  afterAll(async () => {
    await dbManager.disconnect();
  });

  describe("Connection", () => {
    it("should connect to MongoDB successfully", async () => {
      const db = await dbManager.connect();
      expect(db).toBeDefined();
      expect(dbManager.isConnected()).toBe(true);
    });

    it("should return existing connection on subsequent calls", async () => {
      const db1 = await dbManager.connect();
      const db2 = await dbManager.connect();
      expect(db1).toBe(db2);
    });

    it("should pass health check when connected", async () => {
      await dbManager.connect();
      const healthy = await dbManager.healthCheck();
      expect(healthy).toBe(true);
    });
  });

  describe("Database Operations", () => {
    it("should get database instance", async () => {
      await dbManager.connect();
      const db = dbManager.getDb();
      expect(db).toBeDefined();
    });

    it("should get database instance safely", async () => {
      const db = await dbManager.getDbSafe();
      expect(db).toBeDefined();
    });

    it("should create indexes successfully", async () => {
      await dbManager.connect();
      await expect(dbManager.createIndexes()).resolves.not.toThrow();
    });
  });
});
