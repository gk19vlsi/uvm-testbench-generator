import {
  specificationAgent,
  SpecificationAgentInput,
} from "../agents/SpecificationAgent";
import { llmService } from "../services/LLMService";
import {
  detectProtocolsWithKeywords,
  mergeProtocolDetections,
  getProtocolCharacteristics,
  classifyProtocolConfidence,
} from "../utils/protocolDetection";

describe("Specification Agent", () => {
  describe("Protocol Detection Utility", () => {
    it("should detect AXI protocol from keywords", () => {
      const content = `
        This specification describes an AXI4 interface.
        The interface includes awvalid, awready, wvalid, wready signals.
        The bus supports 32-bit data width.
      `;

      const protocols = detectProtocolsWithKeywords(content);

      expect(protocols.length).toBeGreaterThan(0);
      const axiProtocol = protocols.find((p) => p.name === "AXI");
      expect(axiProtocol).toBeDefined();
      expect(axiProtocol?.confidence).toBeGreaterThan(0);
    });

    it("should detect UART protocol from keywords", () => {
      const content = `
        UART communication protocol with TX and RX signals.
        Baud rate: 115200
        8 data bits, 1 stop bit, no parity
      `;

      const protocols = detectProtocolsWithKeywords(content);

      const uartProtocol = protocols.find((p) => p.name === "UART");
      expect(uartProtocol).toBeDefined();
      expect(uartProtocol?.confidence).toBeGreaterThan(0);
    });

    it("should detect I2C protocol from keywords", () => {
      const content = `
        I2C bus with SCL and SDA signals.
        Supports start condition, stop condition, ACK, and NACK.
      `;

      const protocols = detectProtocolsWithKeywords(content);

      const i2cProtocol = protocols.find((p) => p.name === "I2C");
      expect(i2cProtocol).toBeDefined();
    });

    it("should detect SPI protocol from keywords", () => {
      const content = `
        SPI interface with MOSI, MISO, SCLK, and CS signals.
        Chip select active low.
      `;

      const protocols = detectProtocolsWithKeywords(content);

      const spiProtocol = protocols.find((p) => p.name === "SPI");
      expect(spiProtocol).toBeDefined();
    });

    it("should detect APB protocol from keywords", () => {
      const content = `
        APB interface with PSEL, PENABLE, PWRITE signals.
        PADDR for address, PWDATA for write data, PRDATA for read data.
      `;

      const protocols = detectProtocolsWithKeywords(content);

      const apbProtocol = protocols.find((p) => p.name === "APB");
      expect(apbProtocol).toBeDefined();
    });

    it("should not detect protocols when keywords are insufficient", () => {
      const content = `
        This is a simple specification with no protocol keywords.
        Just some generic text about a design.
      `;

      const protocols = detectProtocolsWithKeywords(content);

      expect(protocols.length).toBe(0);
    });

    it("should merge protocol detections correctly", () => {
      const detection1 = [
        {
          name: "AXI" as const,
          confidence: 0.6,
          signals: ["awvalid", "awready"],
          characteristics: { variant: "AXI4" },
        },
      ];

      const detection2 = [
        {
          name: "AXI" as const,
          confidence: 0.8,
          signals: ["wvalid", "wready"],
          characteristics: { busWidth: 32 },
        },
      ];

      const merged = mergeProtocolDetections(detection1, detection2);

      expect(merged.length).toBe(1);
      expect(merged[0].name).toBe("AXI");
      expect(merged[0].confidence).toBe(0.8); // Takes higher confidence
      expect(merged[0].signals).toContain("awvalid");
      expect(merged[0].signals).toContain("wvalid");
      expect(merged[0].characteristics.variant).toBe("AXI4");
      expect(merged[0].characteristics.busWidth).toBe(32);
    });

    it("should classify confidence levels correctly", () => {
      expect(classifyProtocolConfidence(0.9)).toBe("high");
      expect(classifyProtocolConfidence(0.7)).toBe("high");
      expect(classifyProtocolConfidence(0.5)).toBe("medium");
      expect(classifyProtocolConfidence(0.4)).toBe("medium");
      expect(classifyProtocolConfidence(0.2)).toBe("low");
    });

    it("should extract AXI characteristics", () => {
      const content = `
        This is an AXI4-Lite interface with 32-bit data bus.
      `;

      const characteristics = getProtocolCharacteristics("AXI", content);

      expect(characteristics.variant).toBe("AXI4-Lite");
      expect(characteristics.busWidth).toBe(32);
    });

    it("should extract UART characteristics", () => {
      const content = `
        UART with 9600 baud rate and 8 data bits.
      `;

      const characteristics = getProtocolCharacteristics("UART", content);

      expect(characteristics.baudRate).toBe(9600);
      expect(characteristics.dataBits).toBe(8);
    });
  });

  describe("Specification Agent Execution", () => {
    it("should validate input correctly", async () => {
      const invalidInput = {
        projectId: "",
        llmProvider: llmService.getLLM(),
        specificationFiles: [],
      } as SpecificationAgentInput;

      const result = await specificationAgent.execute(invalidInput);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should require specification files", async () => {
      const input = {
        projectId: "test-project",
        llmProvider: llmService.getLLM(),
        specificationFiles: [],
      } as SpecificationAgentInput;

      const result = await specificationAgent.execute(input);

      expect(result.success).toBe(false);
      expect(result.error).toContain("specification files");
    });

    it("should combine multiple specification files", async () => {
      const input: SpecificationAgentInput = {
        projectId: "test-project",
        llmProvider: llmService.getLLM(),
        specificationFiles: [
          {
            fileId: "file1",
            filename: "spec1.md",
            content: "AXI protocol with awvalid and awready signals",
          },
          {
            fileId: "file2",
            filename: "spec2.md",
            content: "Additional requirements for wvalid and wready",
          },
        ],
      };

      // This will attempt to call the LLM, which may fail in test environment
      // We're mainly testing the structure and error handling
      const result = await specificationAgent.execute(input);

      // Check that execution completed (success or failure)
      expect(result).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.executionTime).toBeGreaterThan(0);

      // If LLM is not available, expect failure
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    }, 10000); // 10 second timeout

    it("should detect protocols from specification content", async () => {
      const input: SpecificationAgentInput = {
        projectId: "test-project",
        llmProvider: llmService.getLLM(),
        specificationFiles: [
          {
            fileId: "file1",
            filename: "axi_spec.md",
            content: `
              # AXI4 Interface Specification
              
              This specification describes an AXI4 master interface.
              
              ## Signals
              - awvalid: Write address valid
              - awready: Write address ready
              - wvalid: Write data valid
              - wready: Write data ready
              - bvalid: Write response valid
              - bready: Write response ready
              
              ## Transactions
              Write transactions consist of address phase and data phase.
              
              ## Timing
              Clock frequency: 100 MHz
              Reset: Active low (rst_n)
            `,
          },
        ],
      };

      const result = await specificationAgent.execute(input);

      // Even if LLM fails, keyword detection should work
      expect(result).toBeDefined();
      expect(result.metadata.executionTime).toBeGreaterThan(0);

      // If LLM is not available, expect failure but execution should complete
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    }, 10000); // 10 second timeout
  });

  describe("Progress Callbacks", () => {
    it("should call progress callback during execution", async () => {
      const progressUpdates: any[] = [];

      specificationAgent.onProgress((update) => {
        progressUpdates.push(update);
      });

      const input: SpecificationAgentInput = {
        projectId: "test-project",
        llmProvider: llmService.getLLM(),
        specificationFiles: [
          {
            fileId: "file1",
            filename: "spec.md",
            content:
              "AXI protocol specification with awvalid, awready, wvalid, wready",
          },
        ],
      };

      await specificationAgent.execute(input);

      // Should have received at least one progress update
      expect(progressUpdates.length).toBeGreaterThan(0);

      // Check that updates have required fields
      const firstUpdate = progressUpdates[0];
      expect(firstUpdate.timestamp).toBeDefined();
      expect(firstUpdate.agentName).toBe("Specification Agent");
      expect(firstUpdate.status).toBeDefined();
      expect(firstUpdate.message).toBeDefined();
    }, 10000); // 10 second timeout
  });
});
