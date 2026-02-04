import { DetectedProtocol } from "../agents/SpecificationAgent";
import logger from "../config/logger";

/**
 * Protocol keyword patterns for detection
 */
interface ProtocolPattern {
  name: "AXI" | "APB" | "UART" | "I2C" | "SPI";
  keywords: string[];
  requiredMatches: number;
  signalPatterns?: RegExp[];
}

/**
 * Protocol detection patterns
 */
const PROTOCOL_PATTERNS: ProtocolPattern[] = [
  {
    name: "AXI",
    keywords: [
      "axi",
      "awvalid",
      "awready",
      "awaddr",
      "wvalid",
      "wready",
      "wdata",
      "bvalid",
      "bready",
      "bresp",
      "arvalid",
      "arready",
      "araddr",
      "rvalid",
      "rready",
      "rdata",
      "rresp",
    ],
    requiredMatches: 3,
    signalPatterns: [
      /\b[a-z_]*awvalid\b/i,
      /\b[a-z_]*awready\b/i,
      /\b[a-z_]*wvalid\b/i,
      /\b[a-z_]*wready\b/i,
    ],
  },
  {
    name: "APB",
    keywords: [
      "apb",
      "psel",
      "penable",
      "pwrite",
      "paddr",
      "pwdata",
      "prdata",
      "pready",
      "pslverr",
    ],
    requiredMatches: 3,
    signalPatterns: [
      /\b[a-z_]*psel\b/i,
      /\b[a-z_]*penable\b/i,
      /\b[a-z_]*pwrite\b/i,
    ],
  },
  {
    name: "UART",
    keywords: [
      "uart",
      "tx",
      "rx",
      "baud",
      "serial",
      "start bit",
      "stop bit",
      "parity",
      "transmit",
      "receive",
    ],
    requiredMatches: 2,
    signalPatterns: [/\b[a-z_]*tx\b/i, /\b[a-z_]*rx\b/i, /\buart[a-z_]*\b/i],
  },
  {
    name: "I2C",
    keywords: [
      "i2c",
      "scl",
      "sda",
      "start condition",
      "stop condition",
      "ack",
      "nack",
      "address",
      "slave",
      "master",
    ],
    requiredMatches: 2,
    signalPatterns: [/\b[a-z_]*scl\b/i, /\b[a-z_]*sda\b/i, /\bi2c[a-z_]*\b/i],
  },
  {
    name: "SPI",
    keywords: [
      "spi",
      "mosi",
      "miso",
      "sclk",
      "cs",
      "chip select",
      "slave select",
      "ss",
    ],
    requiredMatches: 2,
    signalPatterns: [
      /\b[a-z_]*mosi\b/i,
      /\b[a-z_]*miso\b/i,
      /\b[a-z_]*sclk\b/i,
      /\b[a-z_]*cs\b/i,
    ],
  },
];

/**
 * Detect protocols using keyword matching
 */
export function detectProtocolsWithKeywords(
  content: string,
): DetectedProtocol[] {
  const protocols: DetectedProtocol[] = [];
  const contentLower = content.toLowerCase();

  for (const pattern of PROTOCOL_PATTERNS) {
    const matches = pattern.keywords.filter((kw) =>
      contentLower.includes(kw.toLowerCase()),
    );

    if (matches.length >= pattern.requiredMatches) {
      const confidence = Math.min(
        matches.length / pattern.keywords.length,
        1.0,
      );

      // Extract signal names using patterns
      const signals = extractSignals(content, pattern.signalPatterns || []);

      protocols.push({
        name: pattern.name,
        confidence,
        signals: [...new Set([...matches, ...signals])],
        characteristics: {},
      });

      logger.info(
        `Detected ${pattern.name} protocol with confidence ${confidence.toFixed(2)}`,
        {
          matches: matches.length,
          signals: signals.length,
        },
      );
    }
  }

  return protocols;
}

/**
 * Extract signal names using regex patterns
 */
function extractSignals(content: string, patterns: RegExp[]): string[] {
  const signals: string[] = [];

  for (const pattern of patterns) {
    const matches = content.match(new RegExp(pattern, "gi"));
    if (matches) {
      signals.push(...matches);
    }
  }

  return [...new Set(signals)];
}

/**
 * Classify protocol by confidence score
 */
export function classifyProtocolConfidence(
  confidence: number,
): "high" | "medium" | "low" {
  if (confidence >= 0.7) return "high";
  if (confidence >= 0.4) return "medium";
  return "low";
}

/**
 * Merge protocol detections from multiple sources
 */
export function mergeProtocolDetections(
  ...detections: DetectedProtocol[][]
): DetectedProtocol[] {
  const merged = new Map<string, DetectedProtocol>();

  for (const detection of detections) {
    for (const protocol of detection) {
      const existing = merged.get(protocol.name);
      if (existing) {
        // Merge: take higher confidence and combine signals
        merged.set(protocol.name, {
          name: protocol.name,
          confidence: Math.max(existing.confidence, protocol.confidence),
          signals: Array.from(
            new Set([...existing.signals, ...protocol.signals]),
          ),
          characteristics: {
            ...existing.characteristics,
            ...protocol.characteristics,
          },
        });
      } else {
        merged.set(protocol.name, protocol);
      }
    }
  }

  // Sort by confidence (highest first)
  return Array.from(merged.values()).sort(
    (a, b) => b.confidence - a.confidence,
  );
}

/**
 * Get protocol-specific characteristics
 */
export function getProtocolCharacteristics(
  protocolName: string,
  content: string,
): Record<string, any> {
  const characteristics: Record<string, any> = {};

  switch (protocolName) {
    case "AXI":
      // Try to detect AXI variant (AXI4, AXI4-Lite, AXI3)
      if (content.toLowerCase().includes("axi4-lite")) {
        characteristics.variant = "AXI4-Lite";
      } else if (content.toLowerCase().includes("axi4")) {
        characteristics.variant = "AXI4";
      } else if (content.toLowerCase().includes("axi3")) {
        characteristics.variant = "AXI3";
      }

      // Try to detect bus width
      const widthMatch = content.match(/(\d+)[-\s]?bit\s+(?:data\s+)?bus/i);
      if (widthMatch) {
        characteristics.busWidth = parseInt(widthMatch[1]);
      }
      break;

    case "APB":
      // Try to detect APB version
      if (content.toLowerCase().includes("apb4")) {
        characteristics.version = "APB4";
      } else if (content.toLowerCase().includes("apb3")) {
        characteristics.version = "APB3";
      }
      break;

    case "UART":
      // Try to detect baud rate
      const baudMatch = content.match(/(\d+)\s*baud/i);
      if (baudMatch) {
        characteristics.baudRate = parseInt(baudMatch[1]);
      }

      // Try to detect data bits
      const dataBitsMatch = content.match(/(\d+)\s*data\s*bits?/i);
      if (dataBitsMatch) {
        characteristics.dataBits = parseInt(dataBitsMatch[1]);
      }
      break;

    case "I2C":
      // Try to detect speed mode
      if (content.toLowerCase().includes("fast mode")) {
        characteristics.speedMode = "Fast Mode (400 kHz)";
      } else if (content.toLowerCase().includes("standard mode")) {
        characteristics.speedMode = "Standard Mode (100 kHz)";
      }
      break;

    case "SPI":
      // Try to detect SPI mode
      const modeMatch = content.match(/spi\s*mode\s*(\d+)/i);
      if (modeMatch) {
        characteristics.mode = parseInt(modeMatch[1]);
      }
      break;
  }

  return characteristics;
}
