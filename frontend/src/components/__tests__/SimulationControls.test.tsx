/**
 * SimulationControls Component Tests
 * Unit tests for the SimulationControls React component
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import SimulationControls from "../SimulationControls";
import { SimulationEngine } from "../../services/SimulationEngine";

describe("SimulationControls Component", () => {
  let engine: SimulationEngine;

  beforeEach(() => {
    engine = new SimulationEngine();
    jest.clearAllMocks();
  });

  afterEach(() => {
    engine.destroy();
  });

  it("should render the component", () => {
    render(<SimulationControls engine={engine} />);

    // Check for control buttons
    expect(screen.getByTitle("Play")).toBeInTheDocument();
    expect(screen.getByTitle("Pause")).toBeInTheDocument();
    expect(screen.getByTitle("Reset")).toBeInTheDocument();
  });

  it("should display initial simulation state", () => {
    render(<SimulationControls engine={engine} />);

    // Check for time display
    expect(screen.getByText("Time:")).toBeInTheDocument();
    expect(screen.getByText("0.00")).toBeInTheDocument();

    // Check for cycle count
    expect(screen.getByText("Cycles:")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("should display current phase", () => {
    render(<SimulationControls engine={engine} />);

    expect(screen.getByText("Current Phase:")).toBeInTheDocument();
    expect(screen.getByText("reset")).toBeInTheDocument();
  });

  it("should display speed control", () => {
    render(<SimulationControls engine={engine} />);

    expect(screen.getByText("Simulation Speed")).toBeInTheDocument();
    expect(screen.getByRole("slider")).toBeInTheDocument();
  });

  it("should display speed presets", () => {
    render(<SimulationControls engine={engine} />);

    expect(screen.getByText("0.25x")).toBeInTheDocument();
    expect(screen.getByText("0.5x")).toBeInTheDocument();
    expect(screen.getByText("2x")).toBeInTheDocument();
    expect(screen.getByText("4x")).toBeInTheDocument();
  });

  it("should handle play button click", () => {
    const startSpy = jest.spyOn(engine, "start");
    render(<SimulationControls engine={engine} />);

    const playButton = screen.getByTitle("Play");
    fireEvent.click(playButton);

    expect(startSpy).toHaveBeenCalled();
  });

  it("should handle pause button click", async () => {
    const pauseSpy = jest.spyOn(engine, "pause");
    render(<SimulationControls engine={engine} />);

    // Start simulation first
    engine.start();

    await waitFor(() => {
      expect(screen.getByText("Running")).toBeInTheDocument();
    });

    const pauseButton = screen.getByTitle("Pause");
    fireEvent.click(pauseButton);

    expect(pauseSpy).toHaveBeenCalled();
  });

  it("should handle reset button click", () => {
    const resetSpy = jest.spyOn(engine, "reset");
    render(<SimulationControls engine={engine} />);

    const resetButton = screen.getByTitle("Reset");
    fireEvent.click(resetButton);

    expect(resetSpy).toHaveBeenCalled();
  });

  it("should disable play button when running", async () => {
    render(<SimulationControls engine={engine} />);

    const playButton = screen.getByTitle("Play");

    // Start simulation
    engine.start();

    await waitFor(() => {
      expect(playButton).toBeDisabled();
    });
  });

  it("should disable pause button when not running", () => {
    render(<SimulationControls engine={engine} />);

    const pauseButton = screen.getByTitle("Pause");
    expect(pauseButton).toBeDisabled();
  });

  it("should show running indicator when simulation is running", async () => {
    render(<SimulationControls engine={engine} />);

    // Initially not running
    expect(screen.queryByText("Running")).not.toBeInTheDocument();

    // Start simulation
    engine.start();

    await waitFor(() => {
      expect(screen.getByText("Running")).toBeInTheDocument();
    });
  });

  it("should handle speed preset button click", () => {
    const setSpeedSpy = jest.spyOn(engine, "setSpeed");
    render(<SimulationControls engine={engine} />);

    const preset2xButton = screen.getByText("2x");
    fireEvent.click(preset2xButton);

    expect(setSpeedSpy).toHaveBeenCalledWith(2.0);
  });

  it("should handle speed slider change", () => {
    const setSpeedSpy = jest.spyOn(engine, "setSpeed");
    render(<SimulationControls engine={engine} />);

    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "3.5" } });

    expect(setSpeedSpy).toHaveBeenCalledWith(3.5);
  });

  it("should update speed display when speed changes", () => {
    render(<SimulationControls engine={engine} />);

    const preset2xButton = screen.getByText("2x");
    fireEvent.click(preset2xButton);

    // Check that the slider value updated
    const slider = screen.getByRole("slider") as HTMLInputElement;
    expect(slider.value).toBe("2");
  });

  it("should highlight active speed preset", () => {
    const { container } = render(<SimulationControls engine={engine} />);

    // Find the 1x button (should be highlighted by default)
    const buttons = container.querySelectorAll("button");
    const preset1xButton = Array.from(buttons).find(
      (btn) => btn.textContent?.trim() === "1x",
    );
    expect(preset1xButton).toHaveClass("bg-blue-500");

    // Click 2x button
    const preset2xButton = screen.getByText("2x");
    fireEvent.click(preset2xButton);

    expect(preset2xButton).toHaveClass("bg-blue-500");
  });

  it("should display events when they exist", async () => {
    render(<SimulationControls engine={engine} />);

    // Add an event
    engine.addEvent({
      time: 10.5,
      type: "transaction",
      description: "Test transaction",
      severity: "info",
    });

    await waitFor(() => {
      expect(screen.getByText(/Recent Events/)).toBeInTheDocument();
      expect(screen.getByText("Test transaction")).toBeInTheDocument();
    });
  });

  it("should not display events section when no events", () => {
    render(<SimulationControls engine={engine} />);

    expect(screen.queryByText(/Recent Events/)).not.toBeInTheDocument();
  });

  it("should display event severity colors", async () => {
    render(<SimulationControls engine={engine} />);

    // Add events with different severities
    engine.addEvent({
      time: 10,
      type: "error",
      description: "Error event",
      severity: "error",
    });

    engine.addEvent({
      time: 20,
      type: "assertion",
      description: "Warning event",
      severity: "warning",
    });

    await waitFor(() => {
      expect(screen.getByText("Error event")).toBeInTheDocument();
      expect(screen.getByText("Warning event")).toBeInTheDocument();
    });
  });

  it("should apply custom className", () => {
    const { container } = render(
      <SimulationControls engine={engine} className="custom-class" />,
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass("custom-class");
  });

  it("should update state when engine state changes", async () => {
    render(<SimulationControls engine={engine} />);

    // Start simulation
    engine.start();

    await waitFor(() => {
      expect(screen.getByText("Running")).toBeInTheDocument();
    });

    // Pause simulation
    engine.pause();

    await waitFor(() => {
      expect(screen.queryByText("Running")).not.toBeInTheDocument();
    });
  });

  it("should show restart button text when simulation is complete", async () => {
    render(<SimulationControls engine={engine} />);

    // Set phase to complete
    engine.setPhase("complete");

    await waitFor(() => {
      const playButton = screen.getByTitle("Restart");
      expect(playButton).toBeInTheDocument();
    });
  });

  it("should reset and start when play is clicked after completion", async () => {
    const resetSpy = jest.spyOn(engine, "reset");
    const startSpy = jest.spyOn(engine, "start");

    render(<SimulationControls engine={engine} />);

    // Set phase to complete
    engine.setPhase("complete");

    await waitFor(() => {
      const playButton = screen.getByTitle("Restart");
      expect(playButton).toBeInTheDocument();
    });

    const playButton = screen.getByTitle("Restart");
    fireEvent.click(playButton);

    expect(resetSpy).toHaveBeenCalled();
    expect(startSpy).toHaveBeenCalled();
  });

  it("should display phase icons", () => {
    render(<SimulationControls engine={engine} />);

    // Check for SVG icon in phase display
    const phaseDisplay = screen.getByText("reset").closest("div");
    const svg = phaseDisplay?.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("should limit events display to last 5", async () => {
    render(<SimulationControls engine={engine} />);

    // Add 10 events
    for (let i = 0; i < 10; i++) {
      engine.addEvent({
        time: i,
        type: "transaction",
        description: `Event ${i}`,
        severity: "info",
      });
    }

    await waitFor(() => {
      expect(screen.getByText(/Recent Events/)).toBeInTheDocument();
    });

    // Should show "Recent Events" with count
    expect(screen.getByText(/Recent Events \(10\)/)).toBeInTheDocument();

    // Should only display last 5 events
    expect(screen.getByText("Event 9")).toBeInTheDocument();
    expect(screen.getByText("Event 8")).toBeInTheDocument();
    expect(screen.getByText("Event 7")).toBeInTheDocument();
    expect(screen.getByText("Event 6")).toBeInTheDocument();
    expect(screen.getByText("Event 5")).toBeInTheDocument();
    expect(screen.queryByText("Event 4")).not.toBeInTheDocument();
  });
});
