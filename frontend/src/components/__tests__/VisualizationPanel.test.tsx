/**
 * VisualizationPanel Integration Tests
 * Tests VCD parser integration with waveform display
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import VisualizationPanel from "../VisualizationPanel";
import { TestbenchSpecification } from "../../types/simulation";

// Mock the child components
jest.mock("../WaveformDisplay", () => ({
  __esModule: true,
  default: ({ signals, signalData }: any) => (
    <div data-testid="waveform-display">
      <div data-testid="signal-count">{signals.length}</div>
      <div data-testid="signal-data-count">{signalData.length}</div>
    </div>
  ),
}));

jest.mock("../ComponentDiagram", () => ({
  __esModule: true,
  default: () => <div data-testid="component-diagram">Component Diagram</div>,
}));

jest.mock("../SimulationControls", () => ({
  __esModule: true,
  default: () => <div data-testid="simulation-controls">Controls</div>,
}));

jest.mock("../ProgressIndicator", () => ({
  __esModule: true,
  default: () => <div data-testid="progress-indicator">Progress</div>,
}));

jest.mock("../Timeline", () => ({
  __esModule: true,
  default: () => <div data-testid="timeline">Timeline</div>,
}));

jest.mock("../VCDFileUpload", () => ({
  __esModule: true,
  default: ({ onVCDParsed }: any) => (
    <div data-testid="vcd-upload">
      <button
        data-testid="mock-vcd-parse"
        onClick={() => {
          // Simulate VCD parsing
          const mockVCDData = {
            header: {
              date: "Mon Feb 5 12:00:00 2026",
              version: "ModelSim 10.5",
              timescale: { value: 1, unit: "ns" },
              comment: "Test VCD",
            },
            signals: new Map([
              [
                "!",
                {
                  identifier: "!",
                  name: "clk",
                  scope: ["testbench"],
                  type: "wire" as const,
                  bitWidth: 1,
                },
              ],
              [
                '"',
                {
                  identifier: '"',
                  name: "data",
                  scope: ["testbench"],
                  type: "wire" as const,
                  bitWidth: 8,
                },
              ],
            ]),
            valueChanges: new Map([
              [
                "!",
                [
                  { time: 0, value: "0" },
                  { time: 10, value: "1" },
                  { time: 20, value: "0" },
                ],
              ],
              [
                '"',
                [
                  { time: 0, value: "00000000" },
                  { time: 10, value: "11110000" },
                ],
              ],
            ]),
            timeRange: { start: 0, end: 20 },
          };
          onVCDParsed(mockVCDData, "test.vcd");
        }}
      >
        Parse VCD
      </button>
    </div>
  ),
}));

const mockSpecification: TestbenchSpecification = {
  rtl: {
    moduleName: "test_dut",
    ports: [],
  },
  verification: {
    testCases: [],
    coverageGoals: [],
  },
  components: [
    {
      id: "env_1",
      type: "env",
      name: "test_env",
      children: [],
    },
  ],
  signals: [],
  clocks: [
    {
      name: "clk",
      period: 10,
      dutyCycle: 0.5,
      phase: 0,
    },
  ],
};

describe("VisualizationPanel VCD Integration", () => {
  const renderPanel = (props = {}) => {
    return render(
      <BrowserRouter>
        <VisualizationPanel
          projectId="test-project"
          specification={mockSpecification}
          signals={[]}
          signalData={[]}
          {...props}
        />
      </BrowserRouter>
    );
  };

  it("should render the visualization panel", () => {
    renderPanel();
    expect(screen.getByText("Simulation Visualization")).toBeInTheDocument();
  });

  it("should show upload VCD button in waveform tab", () => {
    renderPanel();
    
    // Switch to waveform tab first
    fireEvent.click(screen.getByText("Waveform"));
    
    expect(screen.getByText("Upload VCD File")).toBeInTheDocument();
  });

  it("should toggle VCD upload section when button is clicked", () => {
    renderPanel();

    // Switch to waveform tab first
    fireEvent.click(screen.getByText("Waveform"));

    const uploadButton = screen.getByText("Upload VCD File");
    
    // Initially hidden
    expect(screen.queryByTestId("vcd-upload")).not.toBeInTheDocument();

    // Click to show
    fireEvent.click(uploadButton);
    expect(screen.getByTestId("vcd-upload")).toBeInTheDocument();

    // Click to hide
    fireEvent.click(uploadButton);
    expect(screen.queryByTestId("vcd-upload")).not.toBeInTheDocument();
  });

  it("should parse VCD file and display waveforms", async () => {
    renderPanel();

    // Switch to waveform tab first
    fireEvent.click(screen.getByText("Waveform"));

    // Open VCD upload
    const uploadButton = screen.getByText("Upload VCD File");
    fireEvent.click(uploadButton);

    // Trigger VCD parsing
    const parseButton = screen.getByTestId("mock-vcd-parse");
    fireEvent.click(parseButton);

    // Wait for VCD data to be processed
    await waitFor(() => {
      // Check that timescale is displayed
      expect(screen.getByText(/Timescale:/)).toBeInTheDocument();
      expect(screen.getByText(/1ns/)).toBeInTheDocument();
    });

    // Check that filename is displayed
    expect(screen.getByText(/File:/)).toBeInTheDocument();
    expect(screen.getByText(/test.vcd/)).toBeInTheDocument();

    // Check that signals are displayed
    const signalCount = screen.getByTestId("signal-count");
    expect(signalCount.textContent).toBe("2"); // clk and data
  });

  it("should convert VCD data to waveform format", async () => {
    renderPanel();

    // Switch to waveform tab first
    fireEvent.click(screen.getByText("Waveform"));

    // Open VCD upload and parse
    fireEvent.click(screen.getByText("Upload VCD File"));
    fireEvent.click(screen.getByTestId("mock-vcd-parse"));

    await waitFor(() => {
      // Check that signal data is converted
      const signalDataCount = screen.getByTestId("signal-data-count");
      expect(signalDataCount.textContent).toBe("2");
    });
  });

  it("should display VCD signals with correct signal count", async () => {
    renderPanel();

    // Switch to waveform tab first
    fireEvent.click(screen.getByText("Waveform"));

    // Open VCD upload and parse
    fireEvent.click(screen.getByText("Upload VCD File"));
    fireEvent.click(screen.getByTestId("mock-vcd-parse"));

    await waitFor(() => {
      // Check signal count display
      expect(screen.getByText("2 signals")).toBeInTheDocument();
    });
  });

  it("should hide VCD upload section after successful parse", async () => {
    renderPanel();

    // Switch to waveform tab first
    fireEvent.click(screen.getByText("Waveform"));

    // Open VCD upload
    fireEvent.click(screen.getByText("Upload VCD File"));
    expect(screen.getByTestId("vcd-upload")).toBeInTheDocument();

    // Parse VCD
    fireEvent.click(screen.getByTestId("mock-vcd-parse"));

    await waitFor(() => {
      // Upload section should be hidden
      expect(screen.queryByTestId("vcd-upload")).not.toBeInTheDocument();
    });
  });

  it("should prefer VCD signals over default signals", async () => {
    const defaultSignals = [
      {
        id: "default_sig",
        name: "default_sig",
        type: "data" as const,
        color: "#000000",
        bitWidth: 1,
      },
    ];

    const defaultSignalData = [
      {
        signalId: "default_sig",
        transitions: [{ time: 0, value: 0 }],
      },
    ];

    renderPanel({
      signals: defaultSignals,
      signalData: defaultSignalData,
    });

    // Switch to waveform tab first
    fireEvent.click(screen.getByText("Waveform"));

    // Initially should show default signal
    expect(screen.getByText("1 signal")).toBeInTheDocument();

    // Parse VCD
    fireEvent.click(screen.getByText("Upload VCD File"));
    fireEvent.click(screen.getByTestId("mock-vcd-parse"));

    await waitFor(() => {
      // Should now show VCD signals (2 signals)
      expect(screen.getByText("2 signals")).toBeInTheDocument();
    });
  });

  it("should switch between tabs correctly", () => {
    // Render with some signals so waveform display is shown
    const testSignals = [
      {
        id: "test_sig",
        name: "test_sig",
        type: "data" as const,
        color: "#000000",
        bitWidth: 1,
      },
    ];

    const testSignalData = [
      {
        signalId: "test_sig",
        transitions: [{ time: 0, value: 0 }],
      },
    ];

    renderPanel({
      generationId: "test-gen-id",
      signals: testSignals,
      signalData: testSignalData,
    });

    // Initially on simulation tab (default)
    expect(screen.getByText("HDL Simulation")).toBeInTheDocument();

    // Switch to waveform tab
    fireEvent.click(screen.getByText("Waveform"));
    expect(screen.getByTestId("waveform-display")).toBeInTheDocument();

    // Switch to component tab
    fireEvent.click(screen.getByText("Component Diagram"));
    expect(screen.getByTestId("component-diagram")).toBeInTheDocument();
    expect(screen.queryByTestId("waveform-display")).not.toBeInTheDocument();

    // Switch to timeline tab
    fireEvent.click(screen.getByText("Timeline"));
    expect(screen.getByTestId("timeline")).toBeInTheDocument();
    expect(screen.queryByTestId("component-diagram")).not.toBeInTheDocument();

    // Switch back to waveform tab
    fireEvent.click(screen.getByText("Waveform"));
    expect(screen.getByTestId("waveform-display")).toBeInTheDocument();
  });
});
