import { Port } from "../parsers/rtlParser";
import { ClockSignal, ResetSignal } from "../agents/RTLAgent";
import logger from "../config/logger";

/**
 * Signal classification patterns
 */
interface SignalPattern {
  type: "clock" | "reset" | "data" | "control" | "address";
  patterns: RegExp[];
  priority: number;
}

/**
 * Protocol-specific signal patterns
 */
export const PROTOCOL_SIGNAL_PATTERNS: Record<string, SignalPattern[]> = {
  AXI: [
    {
      type: "control",
      patterns: [
        /awvalid/i,
        /awready/i,
        /wvalid/i,
        /wready/i,
        /bvalid/i,
        /bready/i,
      ],
      priority: 10,
    },
    {
      type: "address",
      patterns: [/awaddr/i, /araddr/i],
      priority: 9,
    },
    {
      type: "data",
      patterns: [/wdata/i, /rdata/i],
      priority: 8,
    },
  ],
  APB: [
    {
      type: "control",
      patterns: [/psel/i, /penable/i, /pwrite/i, /pready/i],
      priority: 10,
    },
    {
      type: "address",
      patterns: [/paddr/i],
      priority: 9,
    },
    {
      type: "data",
      patterns: [/pwdata/i, /prdata/i],
      priority: 8,
    },
  ],
  UART: [
    {
      type: "data",
      patterns: [/\btx\b/i, /\brx\b/i, /tx_data/i, /rx_data/i],
      priority: 10,
    },
    {
      type: "control",
      patterns: [/tx_valid/i, /rx_valid/i, /tx_ready/i, /rx_ready/i],
      priority: 9,
    },
  ],
  I2C: [
    {
      type: "data",
      patterns: [/\bsda\b/i],
      priority: 10,
    },
    {
      type: "clock",
      patterns: [/\bscl\b/i],
      priority: 10,
    },
  ],
  SPI: [
    {
      type: "data",
      patterns: [/mosi/i, /miso/i],
      priority: 10,
    },
    {
      type: "clock",
      patterns: [/sclk/i, /spi_clk/i],
      priority: 10,
    },
    {
      type: "control",
      patterns: [/\bcs\b/i, /chip_select/i, /slave_select/i],
      priority: 9,
    },
  ],
};

/**
 * Generic signal patterns
 */
const GENERIC_PATTERNS: SignalPattern[] = [
  {
    type: "clock",
    patterns: [/\bclk\b/i, /\bclock\b/i, /_ck$/i, /^ck_/i, /\bclk_/i, /_clk$/i],
    priority: 10,
  },
  {
    type: "reset",
    patterns: [
      /\brst\b/i,
      /\breset\b/i,
      /^n?rst_/i,
      /_rst$/i,
      /_reset$/i,
      /^rst$/i,
    ],
    priority: 10,
  },
  {
    type: "address",
    patterns: [/\baddr/i, /\baddress/i, /_addr$/i, /^addr_/i],
    priority: 7,
  },
  {
    type: "data",
    patterns: [/\bdata/i, /_data$/i, /^data_/i, /\bwdata/i, /\brdata/i],
    priority: 6,
  },
  {
    type: "control",
    patterns: [
      /valid/i,
      /ready/i,
      /enable/i,
      /\ben\b/i,
      /start/i,
      /stop/i,
      /ack/i,
      /req/i,
      /grant/i,
    ],
    priority: 5,
  },
];

/**
 * Classify clock signals from ports
 */
export function classifyClockSignals(
  ports: Port[],
  content?: string,
): ClockSignal[] {
  const clockSignals: ClockSignal[] = [];

  for (const port of ports) {
    if (isClockSignal(port.name)) {
      const frequency = content
        ? extractFrequency(port.name, content)
        : undefined;

      clockSignals.push({
        name: port.name,
        frequency,
        dutyCycle: 50, // Default duty cycle
      });

      logger.debug(`Classified clock signal: ${port.name}`, { frequency });
    }
  }

  return clockSignals;
}

/**
 * Classify reset signals from ports
 */
export function classifyResetSignals(
  ports: Port[],
  content?: string,
): ResetSignal[] {
  const resetSignals: ResetSignal[] = [];

  for (const port of ports) {
    if (isResetSignal(port.name)) {
      const polarity = determineResetPolarity(port.name);
      const synchronous = content
        ? isResetSynchronous(port.name, content)
        : false;

      resetSignals.push({
        name: port.name,
        polarity,
        synchronous,
      });

      logger.debug(`Classified reset signal: ${port.name}`, {
        polarity,
        synchronous,
      });
    }
  }

  return resetSignals;
}

/**
 * Check if signal name matches clock pattern
 */
export function isClockSignal(signalName: string): boolean {
  const clockPattern = GENERIC_PATTERNS.find((p) => p.type === "clock");
  if (!clockPattern) return false;

  return clockPattern.patterns.some((pattern) => pattern.test(signalName));
}

/**
 * Check if signal name matches reset pattern
 */
export function isResetSignal(signalName: string): boolean {
  const resetPattern = GENERIC_PATTERNS.find((p) => p.type === "reset");
  if (!resetPattern) return false;

  return resetPattern.patterns.some((pattern) => pattern.test(signalName));
}

/**
 * Determine reset polarity from signal name
 */
export function determineResetPolarity(
  signalName: string,
): "active_high" | "active_low" {
  // Active low indicators: n prefix, _n suffix, _b suffix
  const activeLowPatterns = [
    /^n[a-z]/i, // nrst, nreset
    /_n$/i, // rst_n, reset_n
    /_b$/i, // rst_b (bar notation)
    /^rst_n/i,
    /^reset_n/i,
  ];

  const isActiveLow = activeLowPatterns.some((pattern) =>
    pattern.test(signalName),
  );

  return isActiveLow ? "active_low" : "active_high";
}

/**
 * Check if reset is synchronous by looking for edge-sensitive always blocks
 */
export function isResetSynchronous(
  resetName: string,
  content: string,
): boolean {
  // Look for reset in edge-sensitive always blocks
  const syncPatterns = [
    new RegExp(`posedge\\s+${resetName}`, "i"),
    new RegExp(`negedge\\s+${resetName}`, "i"),
    new RegExp(`@\\s*\\(.*${resetName}.*\\)`, "i"),
  ];

  return syncPatterns.some((pattern) => pattern.test(content));
}

/**
 * Extract frequency from content (comments, parameters, etc.)
 */
export function extractFrequency(
  signalName: string,
  content: string,
): number | undefined {
  // Try to find frequency in comments near the signal
  const frequencyPatterns = [
    // MHz patterns
    new RegExp(`${signalName}.*?(\\d+)\\s*MHz`, "i"),
    new RegExp(`${signalName}.*?(\\d+)\\s*mhz`, "i"),
    new RegExp(`(\\d+)\\s*MHz.*${signalName}`, "i"),
    // Hz patterns
    new RegExp(`${signalName}.*?(\\d+)\\s*Hz`, "i"),
    new RegExp(`(\\d+)\\s*Hz.*${signalName}`, "i"),
    // KHz patterns
    new RegExp(`${signalName}.*?(\\d+)\\s*KHz`, "i"),
    new RegExp(`(\\d+)\\s*KHz.*${signalName}`, "i"),
  ];

  for (const pattern of frequencyPatterns) {
    const match = content.match(pattern);
    if (match) {
      const value = parseInt(match[1]);
      // Convert to Hz
      if (pattern.source.includes("MHz")) {
        return value * 1000000;
      } else if (pattern.source.includes("KHz")) {
        return value * 1000;
      } else {
        return value;
      }
    }
  }

  return undefined;
}

/**
 * Classify signal by type (clock, reset, data, control, address)
 */
export function classifySignalType(
  signalName: string,
  protocol?: string,
): string {
  // Check protocol-specific patterns first
  if (protocol && PROTOCOL_SIGNAL_PATTERNS[protocol]) {
    for (const pattern of PROTOCOL_SIGNAL_PATTERNS[protocol]) {
      if (pattern.patterns.some((p) => p.test(signalName))) {
        return pattern.type;
      }
    }
  }

  // Check generic patterns
  for (const pattern of GENERIC_PATTERNS) {
    if (pattern.patterns.some((p) => p.test(signalName))) {
      return pattern.type;
    }
  }

  return "unknown";
}

/**
 * Group related signals by naming convention
 */
export function groupRelatedSignals(ports: Port[]): Map<string, Port[]> {
  const groups = new Map<string, Port[]>();

  for (const port of ports) {
    // Extract base name (remove suffixes like _valid, _ready, _data, etc.)
    const baseName = extractBaseName(port.name);

    if (!groups.has(baseName)) {
      groups.set(baseName, []);
    }

    groups.get(baseName)!.push(port);
  }

  // Filter out single-signal groups
  const filteredGroups = new Map<string, Port[]>();
  for (const [name, signals] of groups.entries()) {
    if (signals.length > 1) {
      filteredGroups.set(name, signals);
    }
  }

  return filteredGroups;
}

/**
 * Extract base name from signal name
 */
function extractBaseName(signalName: string): string {
  // Remove common suffixes
  const suffixes = [
    "_valid",
    "_ready",
    "_data",
    "_addr",
    "_address",
    "_en",
    "_enable",
    "_req",
    "_ack",
    "_resp",
    "_last",
    "_first",
  ];

  let baseName = signalName.toLowerCase();

  for (const suffix of suffixes) {
    if (baseName.endsWith(suffix)) {
      baseName = baseName.substring(0, baseName.length - suffix.length);
      break;
    }
  }

  return baseName;
}

/**
 * Identify protocol-specific signal patterns in ports
 */
export function identifyProtocolSignals(
  ports: Port[],
  protocol: string,
): Port[] {
  const protocolSignals: Port[] = [];

  if (!PROTOCOL_SIGNAL_PATTERNS[protocol]) {
    return protocolSignals;
  }

  for (const port of ports) {
    for (const pattern of PROTOCOL_SIGNAL_PATTERNS[protocol]) {
      if (pattern.patterns.some((p) => p.test(port.name))) {
        protocolSignals.push(port);
        break;
      }
    }
  }

  return protocolSignals;
}
