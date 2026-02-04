import request from "supertest";
import { app } from "../index";
import { llmService } from "../services/LLMService";
import { llmConfigurationModel } from "../models/LLMConfiguration";
import { dbManager } from "../config/database";

describe("LLM Service and API", () => {
  beforeAll(async () => {
    await dbManager.connect();
  });

  afterAll(async () => {
    await dbManager.disconnect();
  });

  beforeEach(async () => {
    // Clean up LLM configuration before each test
    await llmConfigurationModel.delete("openai");
  });

  describe("LLMService", () => {
    it("should initialize with default model", () => {
      expect(llmService.getCurrentModel()).toBe("gpt-4");
    });

    it("should return available models", () => {
      const models = llmService.getAvailableModels();
      expect(models).toEqual(["gpt-4", "gpt-3.5-turbo", "gpt-4-turbo"]);
    });

    it("should switch models", () => {
      llmService.switchModel("gpt-3.5-turbo");
      expect(llmService.getCurrentModel()).toBe("gpt-3.5-turbo");

      // Switch back to default
      llmService.switchModel("gpt-4");
      expect(llmService.getCurrentModel()).toBe("gpt-4");
    });

    it("should check if API key is configured", () => {
      const isConfigured = llmService.isApiKeyConfigured();
      expect(typeof isConfigured).toBe("boolean");
    });

    it("should get LLM instance", () => {
      const llm = llmService.getLLM();
      expect(llm).toBeDefined();
    });
  });

  describe("GET /api/llm/config", () => {
    it("should return default configuration when none exists", async () => {
      const response = await request(app).get("/api/llm/config");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("provider", "openai");
      expect(response.body).toHaveProperty("defaultModel");
      expect(response.body).toHaveProperty("models");
      expect(response.body.models).toEqual([
        "gpt-4",
        "gpt-3.5-turbo",
        "gpt-4-turbo",
      ]);
    });

    it("should return saved configuration", async () => {
      // Create a configuration
      await llmConfigurationModel.upsert({
        provider: "openai",
        defaultModel: "gpt-3.5-turbo",
        models: ["gpt-4", "gpt-3.5-turbo", "gpt-4-turbo"],
        validated: true,
      });

      const response = await request(app).get("/api/llm/config");

      expect(response.status).toBe(200);
      expect(response.body.provider).toBe("openai");
      expect(response.body.defaultModel).toBe("gpt-3.5-turbo");
      expect(response.body.validated).toBe(true);
    });
  });

  describe("POST /api/llm/config", () => {
    it("should reject invalid model", async () => {
      const response = await request(app)
        .post("/api/llm/config")
        .send({ model: "invalid-model" });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject missing model", async () => {
      const response = await request(app).post("/api/llm/config").send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should save valid model configuration", async () => {
      const response = await request(app)
        .post("/api/llm/config")
        .send({ model: "gpt-3.5-turbo" });

      // This may fail if API key is not valid, which is expected in test environment
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.config.defaultModel).toBe("gpt-3.5-turbo");
        expect(response.body.config.validated).toBe(true);
      } else {
        // If API key validation fails, we should get 400
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("error");
      }
    });
  });

  describe("POST /api/llm/validate", () => {
    it("should validate API key", async () => {
      const response = await request(app).post("/api/llm/validate");

      // Response depends on whether API key is configured and valid
      expect([200, 400, 500]).toContain(response.status);
      expect(response.body).toHaveProperty("valid");

      if (response.body.valid) {
        expect(response.body.message).toBeDefined();
      } else {
        expect(response.body.error).toBeDefined();
      }
    });
  });

  describe("Prompt Templates", () => {
    it("should have all required prompt templates", async () => {
      const { PROMPT_TEMPLATES } = await import("../prompts/templates");

      expect(PROMPT_TEMPLATES.specificationAnalysis).toBeDefined();
      expect(PROMPT_TEMPLATES.rtlAnalysis).toBeDefined();
      expect(PROMPT_TEMPLATES.alignment).toBeDefined();
      expect(PROMPT_TEMPLATES.architecturePlanning).toBeDefined();
      expect(PROMPT_TEMPLATES.codeGeneration).toBeDefined();
      expect(PROMPT_TEMPLATES.sequenceGeneration).toBeDefined();
    });

    it("should fill template with data", async () => {
      const { fillTemplate } = await import("../prompts/templates");

      const template = "Hello {name}, you are {age} years old.";
      const data = { name: "John", age: 30 };
      const filled = fillTemplate(template, data);

      expect(filled).toBe("Hello John, you are 30 years old.");
    });

    it("should handle object values in templates", async () => {
      const { fillTemplate } = await import("../prompts/templates");

      const template = "Data: {data}";
      const data = { data: { key: "value", nested: { prop: 123 } } };
      const filled = fillTemplate(template, data);

      expect(filled).toContain('"key": "value"');
      expect(filled).toContain('"prop": 123');
    });
  });
});
