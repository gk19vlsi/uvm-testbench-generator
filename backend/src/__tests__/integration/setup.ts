import { MongoClient, Db } from "mongodb";
import * as fs from "fs";
import * as path from "path";

/**
 * Integration test setup and teardown utilities
 */

let testDb: Db;
let mongoClient: MongoClient;

export async function setupIntegrationTests() {
  const mongoUri =
    process.env.TEST_MONGODB_URI ||
    "mongodb+srv://gkt2work_db_user:a0T824d9ek4rA9ou@cluster0.cmae5by.mongodb.net/uvm_chatbot_test";

  mongoClient = new MongoClient(mongoUri);
  await mongoClient.connect();

  testDb = mongoClient.db();

  // Clean up test database
  await cleanupTestDatabase();

  // Create test file storage directory
  const testStorageDir = path.join(process.cwd(), "projects_test");
  if (!fs.existsSync(testStorageDir)) {
    fs.mkdirSync(testStorageDir, { recursive: true });
  }

  return { db: testDb, client: mongoClient };
}

export async function teardownIntegrationTests() {
  if (testDb) {
    await cleanupTestDatabase();
  }

  if (mongoClient) {
    await mongoClient.close();
  }

  // Clean up test file storage
  const testStorageDir = path.join(process.cwd(), "projects_test");
  if (fs.existsSync(testStorageDir)) {
    fs.rmSync(testStorageDir, { recursive: true, force: true });
  }
}

export async function cleanupTestDatabase() {
  if (!testDb) return;

  // Delete all collections
  const collections = await testDb.listCollections().toArray();

  for (const collection of collections) {
    await testDb.collection(collection.name).deleteMany({});
  }
}

export function getTestDb(): Db {
  if (!testDb) {
    throw new Error(
      "Test database not initialized. Call setupIntegrationTests first.",
    );
  }
  return testDb;
}

export function getTestMongoClient(): MongoClient {
  if (!mongoClient) {
    throw new Error(
      "Test MongoDB client not initialized. Call setupIntegrationTests first.",
    );
  }
  return mongoClient;
}
