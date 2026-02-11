/**
 * EventVisualization Component Tests
 * Unit tests for the EventVisualization React component
 */

import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import EventVisualization from "../EventVisualization";
import { SimulationEvent } from "../../types/simulation";

describe("EventVisualization Component", () => {
  const mockEvents: SimulationEvent[] = [
    {
      time: 10.5,
      type: "transaction",
      description: "Transaction completed",
      severity: "info",
    },
    {
      time: 25.3,
      type: "assertion",
      description: "Assertion passed",
      severity: "info",
    },
    {
      time: 42.1,
      type: "error",
      description: "Protocol violation",
      severity: "error",
    },
  ];

  it("should render the component", () => {
    render(
      <EventVisualization
        events={[]}
        currentPhase="reset"
        currentTime={0}
      />,
    );

    expect(screen.getByText("Current Phase")).toBeInTheDocument();
    expect(screen.getByText("Event Summary")).toBeInTheDocument();
    expect(screen.getByText("Recent Events")).toBeInTheDocument();
  });

  it("should display current phase", () => {
    render(
      <EventVisualization
        events={[]}
        currentPhase="stimulus"
        currentTime={150.5}
      />,
    );

    expect(screen.getByText("Stimulus Phase")).toBeInTheDocument();
    expect(screen.getByText("Time: 150.50")).toBeInTheDocument();
  });

  it("should display all phase types correctly", () => {
    const phases: Array<{ phase: "reset" | "stimulus" | "checking" | "complete"; label: string }> = [
      { phase: "reset", label: "Reset Phase" },
      { phase: "stimulus", label: "Stimulus Phase" },
      { phase: "checking", label: "Checking Phase" },
      { phase: "complete", label: "Complete" },
    ];

    phases.forEach(({ phase, label }) => {
      const { unmount } = render(
        <EventVisualization
          events={[]}
          currentPhase={phase}
          currentTime={0}
        />,
      );

      expect(screen.getByText(label)).toBeInTheDocument();
      unmount();
    });
  });

  it("should display event summary counts", () => {
    render(
      <EventVisualization
        events={mockEvents}
        currentPhase="stimulus"
        currentTime={50}
      />,
    );

    expect(screen.getByText("Total Events")).toBeInTheDocument();
    expect(screen.getByText("Warnings")).toBeInTheDocument();
    expect(screen.getByText("Errors")).toBeInTheDocument();

    // Check counts
    expect(screen.getByText("3")).toBeInTheDocument(); // Total
    expect(screen.getByText("0")).toBeInTheDocument(); // Warnings
    expect(screen.getByText("1")).toBeInTheDocument(); // Errors
  });

  it("should display recent events", () => {
    render(
      <EventVisualization
        events={mockEvents}
        currentPhase="stimulus"
        currentTime={50}
      />,
    );

    expect(screen.getByText("Transaction completed")).toBeInTheDocument();
    expect(screen.getByText("Assertion passed")).toBeInTheDocument();
    expect(screen.getByText("Protocol violation")).toBeInTheDocument();
  });

  it("should display 'No events yet' when no events", () => {
    render(
      <EventVisualization
        events={[]}
        currentPhase="reset"
        currentTime={0}
      />,
    );

    expect(screen.getByText("No events yet")).toBeInTheDocument();
  });

  it("should display error highlighting when errors exist", () => {
    render(
      <EventVisualization
        events={mockEvents}
        currentPhase="stimulus"
        currentTime={50}
      />,
    );

    expect(screen.getByText("Errors Detected")).toBeInTheDocument();
    expect(
      screen.getByText(/1 error occurred during simulation/),
    ).toBeInTheDocument();
  });

  it("should not display error highlighting when no errors", () => {
    const eventsWithoutErrors: SimulationEvent[] = [
      {
        time: 10,
        type: "transaction",
        description: "Test",
        severity: "info",
      },
    ];

    render(
      <EventVisualization
        events={eventsWithoutErrors}
        currentPhase="stimulus"
        currentTime={50}
      />,
    );

    expect(screen.queryByText("Errors Detected")).not.toBeInTheDocument();
  });

  it("should display event times", () => {
    render(
      <EventVisualization
        events={mockEvents}
        currentPhase="stimulus"
        currentTime={50}
      />,
    );

    expect(screen.getByText("10.50")).toBeInTheDocument();
    expect(screen.getByText("25.30")).toBeInTheDocument();
    expect(screen.getByText("42.10")).toBeInTheDocument();
  });

  it("should display event types", () => {
    const { container } = render(
      <EventVisualization
        events={mockEvents}
        currentPhase="stimulus"
        currentTime={50}
      />,
    );

    // Check for event type labels (uppercase)
    const eventTypes = container.querySelectorAll(".text-xs.font-semibold.uppercase");
    const eventTypeTexts = Array.from(eventTypes).map((el) => el.textContent);
    
    expect(eventTypeTexts).toContain("transaction");
    expect(eventTypeTexts).toContain("assertion");
    expect(eventTypeTexts).toContain("error");
  });

  it("should limit events display to last 10", () => {
    const manyEvents: SimulationEvent[] = Array.from({ length: 15 }, (_, i) => ({
      time: i,
      type: "transaction",
      description: `Event ${i}`,
      severity: "info" as const,
    }));

    render(
      <EventVisualization
        events={manyEvents}
        currentPhase="stimulus"
        currentTime={50}
      />,
    );

    // Should show last 10 events (5-14)
    expect(screen.getByText("Event 14")).toBeInTheDocument();
    expect(screen.getByText("Event 5")).toBeInTheDocument();
    expect(screen.queryByText("Event 4")).not.toBeInTheDocument();
  });

  it("should apply custom className", () => {
    const { container } = render(
      <EventVisualization
        events={[]}
        currentPhase="reset"
        currentTime={0}
        className="custom-class"
      />,
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass("custom-class");
  });

  it("should display phase progress bar", () => {
    const { container } = render(
      <EventVisualization
        events={[]}
        currentPhase="stimulus"
        currentTime={50}
      />,
    );

    // Check for progress bar element
    const progressBar = container.querySelector(".bg-gray-200.rounded-full");
    expect(progressBar).toBeInTheDocument();
  });

  it("should count warnings correctly", () => {
    const eventsWithWarnings: SimulationEvent[] = [
      {
        time: 10,
        type: "assertion",
        description: "Warning 1",
        severity: "warning",
      },
      {
        time: 20,
        type: "assertion",
        description: "Warning 2",
        severity: "warning",
      },
      {
        time: 30,
        type: "error",
        description: "Error 1",
        severity: "error",
      },
    ];

    render(
      <EventVisualization
        events={eventsWithWarnings}
        currentPhase="stimulus"
        currentTime={50}
      />,
    );

    // Find the warnings count (should be 2)
    const warningsSection = screen.getByText("Warnings").parentElement;
    expect(warningsSection?.textContent).toContain("2");
  });

  it("should render event icons", () => {
    const { container } = render(
      <EventVisualization
        events={mockEvents}
        currentPhase="stimulus"
        currentTime={50}
      />,
    );

    // Check for SVG icons
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThan(0);
  });

  it("should handle plural/singular error text", () => {
    const singleError: SimulationEvent[] = [
      {
        time: 10,
        type: "error",
        description: "Single error",
        severity: "error",
      },
    ];

    const { rerender } = render(
      <EventVisualization
        events={singleError}
        currentPhase="stimulus"
        currentTime={50}
      />,
    );

    expect(screen.getByText(/1 error occurred/)).toBeInTheDocument();

    const multipleErrors: SimulationEvent[] = [
      ...singleError,
      {
        time: 20,
        type: "error",
        description: "Second error",
        severity: "error",
      },
    ];

    rerender(
      <EventVisualization
        events={multipleErrors}
        currentPhase="stimulus"
        currentTime={50}
      />,
    );

    expect(screen.getByText(/2 errors occurred/)).toBeInTheDocument();
  });
});
