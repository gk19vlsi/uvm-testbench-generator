/**
 * WaveformDisplay Component Tests
 * Unit tests for the WaveformDisplay React component
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import WaveformDisplay from "../WaveformDisplay";
import { Signal, SignalData } from "../../types/simulation";
import { SimulationProvider } from "../../contexts/SimulationContext";
import { SimulationEngine } from "../../services/SimulationEngine";

// Mock WaveformRenderer
jest.mock("../../services/WaveformRenderer", () => {
  return {
    WaveformRenderer: jest.fn().mockImplementation(() => ({
      initialize: jest.fn(),
      addSignal: jest.fn(),
      removeSignal: jest.fn(),
      updateData: jest.fn(),
      render: jest.fn(),
      setViewTransform: jest.fn(),
      getValueAtTime: jest.fn(),
      xToTime: jest.fn((x: number) => x / 10),
      getSignals: jest.fn(() => []),
      getInfoAtPosition: jest.fn(() => ({
        time: 5.0,
        signal: null,
        value: null,
      })),
      drawCursor: jest.fn(),
    })),
  };
});

describe("WaveformDisplay Component", () => {
  let engine: SimulationEngine;

  const mockSignals: Signal[] = [
    {
      id: "clk",
      name: "clock",
      type: "clock",
      color: "#00FF00",
      bitWidth: 1,
    },
    {
      id: "data",
      name: "data_bus",
      type: "data",
      color: "#FF0000",
      bitWidth: 8,
    },
  ];

  const mockSignalData: SignalData[] = [
    {
      signalId: "clk",
      transitions: [
        { time: 0, value: 0 },
        { time: 5, value: 1 },
        { time: 10, value: 0 },
        { time: 15, value: 1 },
      ],
    },
    {
      signalId: "data",
      transitions: [
        { time: 0, value: 0 },
        { time: 10, value: 255 },
      ],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    engine = new SimulationEngine();
  });

  const renderWithProvider = (component: React.ReactElement) => {
    return render(
      <SimulationProvider engine={engine} projectId="test-project">
        {component}
      </SimulationProvider>
    );
  };

  it("should render the component", () => {
    renderWithProvider(
      <WaveformDisplay signals={mockSignals} signalData={mockSignalData} />,
    );

    // Check for zoom controls
    expect(screen.getByTitle("Zoom In")).toBeInTheDocument();
    expect(screen.getByTitle("Zoom Out")).toBeInTheDocument();
    expect(screen.getByTitle("Reset Zoom")).toBeInTheDocument();
  });

  it("should display zoom percentage", () => {
    renderWithProvider(
      <WaveformDisplay signals={mockSignals} signalData={mockSignalData} />,
    );

    expect(screen.getByText(/Zoom: 100%/)).toBeInTheDocument();
  });

  it("should display interaction hints", () => {
    renderWithProvider(
      <WaveformDisplay signals={mockSignals} signalData={mockSignalData} />,
    );

    expect(screen.getByText("Drag to pan")).toBeInTheDocument();
    expect(screen.getByText("Shift+Drag to select")).toBeInTheDocument();
    expect(screen.getByText("Scroll to zoom")).toBeInTheDocument();
  });

  it("should handle zoom in button click", () => {
    renderWithProvider(
      <WaveformDisplay signals={mockSignals} signalData={mockSignalData} />,
    );

    const zoomInButton = screen.getByTitle("Zoom In");
    fireEvent.click(zoomInButton);

    // Zoom should increase to 150%
    expect(screen.getByText(/Zoom: 150%/)).toBeInTheDocument();
  });

  it("should handle zoom out button click", () => {
    renderWithProvider(
      <WaveformDisplay signals={mockSignals} signalData={mockSignalData} />,
    );

    const zoomOutButton = screen.getByTitle("Zoom Out");
    fireEvent.click(zoomOutButton);

    // Zoom should decrease to 67%
    expect(screen.getByText(/Zoom: 67%/)).toBeInTheDocument();
  });

  it("should handle zoom reset button click", () => {
    renderWithProvider(
      <WaveformDisplay signals={mockSignals} signalData={mockSignalData} />,
    );

    // Zoom in first
    const zoomInButton = screen.getByTitle("Zoom In");
    fireEvent.click(zoomInButton);
    expect(screen.getByText(/Zoom: 150%/)).toBeInTheDocument();

    // Reset zoom
    const resetButton = screen.getByTitle("Reset Zoom");
    fireEvent.click(resetButton);
    expect(screen.getByText(/Zoom: 100%/)).toBeInTheDocument();
  });

  it("should render canvas element", () => {
    const { container } = renderWithProvider(
      <WaveformDisplay signals={mockSignals} signalData={mockSignalData} />,
    );

    const canvas = container.querySelector("canvas");
    expect(canvas).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    const { container } = renderWithProvider(
      <WaveformDisplay
        signals={mockSignals}
        signalData={mockSignalData}
        className="custom-class"
      />,
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass("custom-class");
  });

  it("should handle empty signals array", () => {
    renderWithProvider(<WaveformDisplay signals={[]} signalData={[]} />);

    expect(screen.getByTitle("Zoom In")).toBeInTheDocument();
  });

  it("should call onTimeRangeSelect when selection is made", async () => {
    const onTimeRangeSelect = jest.fn();

    const { container } = renderWithProvider(
      <WaveformDisplay
        signals={mockSignals}
        signalData={mockSignalData}
        onTimeRangeSelect={onTimeRangeSelect}
      />,
    );

    const canvas = container.querySelector("canvas");
    expect(canvas).toBeInTheDocument();

    if (canvas) {
      // Simulate shift+drag selection
      fireEvent.mouseDown(canvas, {
        clientX: 100,
        clientY: 100,
        shiftKey: true,
      });

      fireEvent.mouseMove(canvas, {
        clientX: 200,
        clientY: 100,
        shiftKey: true,
      });

      fireEvent.mouseUp(canvas);

      await waitFor(() => {
        expect(onTimeRangeSelect).toHaveBeenCalled();
      });
    }
  });

  it("should clamp zoom to maximum value", () => {
    renderWithProvider(
      <WaveformDisplay signals={mockSignals} signalData={mockSignalData} />,
    );

    const zoomInButton = screen.getByTitle("Zoom In");

    // Click zoom in multiple times to exceed max
    for (let i = 0; i < 10; i++) {
      fireEvent.click(zoomInButton);
    }

    // Should be clamped at 1000% (10.0 scale)
    expect(screen.getByText(/Zoom: 1000%/)).toBeInTheDocument();
  });

  it("should clamp zoom to minimum value", () => {
    renderWithProvider(
      <WaveformDisplay signals={mockSignals} signalData={mockSignalData} />,
    );

    const zoomOutButton = screen.getByTitle("Zoom Out");

    // Click zoom out multiple times to go below min
    for (let i = 0; i < 10; i++) {
      fireEvent.click(zoomOutButton);
    }

    // Should be clamped at 10% (0.1 scale)
    expect(screen.getByText(/Zoom: 10%/)).toBeInTheDocument();
  });
});
