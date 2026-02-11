/**
 * ComponentDiagram Component Tests
 * Unit tests for the ComponentDiagram React component
 */

import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import ComponentDiagram from "../ComponentDiagram";
import { TestbenchSpecification } from "../../types/simulation";
import { SimulationProvider } from "../../contexts/SimulationContext";
import { SimulationEngine } from "../../services/SimulationEngine";

// Mock ComponentGraphBuilder
jest.mock("../../services/ComponentGraphBuilder", () => {
  return {
    ComponentGraphBuilder: jest.fn().mockImplementation(() => ({
      buildGraph: jest.fn(() => ({
        nodes: [
          {
            id: "env_1",
            type: "env",
            name: "test_env",
            position: { x: 0, y: 0 },
            size: { width: 300, height: 200 },
            children: [
              {
                id: "agent_1",
                type: "agent",
                name: "test_agent",
                position: { x: 0, y: 150 },
                size: { width: 200, height: 150 },
                children: [
                  {
                    id: "driver_1",
                    type: "driver",
                    name: "test_driver",
                    position: { x: 0, y: 300 },
                    size: { width: 120, height: 80 },
                    children: [],
                    properties: {},
                  },
                  {
                    id: "monitor_1",
                    type: "monitor",
                    name: "test_monitor",
                    position: { x: 200, y: 300 },
                    size: { width: 120, height: 80 },
                    children: [],
                    properties: {},
                  },
                ],
                properties: {},
              },
            ],
            properties: {},
          },
        ],
        edges: [
          {
            id: "env_1-agent_1",
            from: "env_1",
            to: "agent_1",
            label: "contains",
            type: "config",
          },
          {
            id: "agent_1-driver_1",
            from: "agent_1",
            to: "driver_1",
            label: "contains",
            type: "config",
          },
          {
            id: "driver_1-monitor_1",
            from: "driver_1",
            to: "monitor_1",
            label: "TLM",
            type: "tlm",
          },
        ],
        layout: {
          type: "hierarchical",
          direction: "top-down",
          spacing: { horizontal: 200, vertical: 150 },
        },
      })),
      highlightComponent: jest.fn(),
      clearHighlight: jest.fn(),
      getGraph: jest.fn(),
    })),
  };
});

describe("ComponentDiagram Component", () => {
  let engine: SimulationEngine;

  const mockSpecification: TestbenchSpecification = {
    rtl: {
      moduleName: "test_module",
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
        children: [
          {
            id: "agent_1",
            type: "agent",
            name: "test_agent",
            children: [
              {
                id: "driver_1",
                type: "driver",
                name: "test_driver",
              },
              {
                id: "monitor_1",
                type: "monitor",
                name: "test_monitor",
              },
            ],
          },
        ],
      },
    ],
    signals: [],
    clocks: [],
  };

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
    renderWithProvider(<ComponentDiagram specification={mockSpecification} />);

    // Check for control buttons
    expect(screen.getByText("Expand All")).toBeInTheDocument();
    expect(screen.getByText("Collapse All")).toBeInTheDocument();
    expect(screen.getByText("Clear Selection")).toBeInTheDocument();
  });

  it("should display interaction hints", () => {
    renderWithProvider(<ComponentDiagram specification={mockSpecification} />);

    expect(
      screen.getByText(/Click components to select/),
    ).toBeInTheDocument();
  });

  it("should render SVG element", () => {
    const { container } = renderWithProvider(
      <ComponentDiagram specification={mockSpecification} />,
    );

    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("should render component legend", () => {
    renderWithProvider(<ComponentDiagram specification={mockSpecification} />);

    expect(screen.getByText("Component Types:")).toBeInTheDocument();
    expect(screen.getByText("Environment")).toBeInTheDocument();
    expect(screen.getByText("Agent")).toBeInTheDocument();
    expect(screen.getByText("Driver")).toBeInTheDocument();
    expect(screen.getByText("Monitor")).toBeInTheDocument();
    expect(screen.getByText("Sequencer")).toBeInTheDocument();
    expect(screen.getByText("Scoreboard")).toBeInTheDocument();
  });

  it("should render component nodes", () => {
    const { container } = renderWithProvider(
      <ComponentDiagram specification={mockSpecification} />,
    );

    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();

    if (svg) {
      // Check for component rectangles
      const rects = svg.querySelectorAll("rect");
      expect(rects.length).toBeGreaterThan(0);

      // Check for component text labels
      const texts = svg.querySelectorAll("text");
      expect(texts.length).toBeGreaterThan(0);
    }
  });

  it("should handle expand all button click", () => {
    renderWithProvider(<ComponentDiagram specification={mockSpecification} />);

    const expandAllButton = screen.getByText("Expand All");
    fireEvent.click(expandAllButton);

    // Component should still be rendered
    expect(screen.getByText("Expand All")).toBeInTheDocument();
  });

  it("should handle collapse all button click", () => {
    renderWithProvider(<ComponentDiagram specification={mockSpecification} />);

    const collapseAllButton = screen.getByText("Collapse All");
    fireEvent.click(collapseAllButton);

    // Component should still be rendered
    expect(screen.getByText("Collapse All")).toBeInTheDocument();
  });

  it("should handle clear selection button click", () => {
    renderWithProvider(<ComponentDiagram specification={mockSpecification} />);

    const clearButton = screen.getByText("Clear Selection");
    fireEvent.click(clearButton);

    // Component should still be rendered
    expect(screen.getByText("Clear Selection")).toBeInTheDocument();
  });

  it("should call onComponentClick when component is clicked", () => {
    const onComponentClick = jest.fn();

    const { container } = renderWithProvider(
      <ComponentDiagram
        specification={mockSpecification}
        onComponentClick={onComponentClick}
      />,
    );

    const svg = container.querySelector("svg");
    if (svg) {
      // Find a component group and click it
      const componentGroups = svg.querySelectorAll("g[style*='cursor: pointer']");
      if (componentGroups.length > 0) {
        fireEvent.click(componentGroups[0]);
        expect(onComponentClick).toHaveBeenCalled();
      }
    }
  });

  it("should apply custom className", () => {
    const { container } = renderWithProvider(
      <ComponentDiagram
        specification={mockSpecification}
        className="custom-class"
      />,
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass("custom-class");
  });

  it("should render arrowhead marker definition", () => {
    const { container } = renderWithProvider(
      <ComponentDiagram specification={mockSpecification} />,
    );

    const svg = container.querySelector("svg");
    if (svg) {
      const defs = svg.querySelector("defs");
      expect(defs).toBeInTheDocument();

      const marker = svg.querySelector("marker#arrowhead");
      expect(marker).toBeInTheDocument();
    }
  });

  it("should handle empty specification gracefully", () => {
    const emptySpec: TestbenchSpecification = {
      rtl: { moduleName: "empty", ports: [] },
      verification: { testCases: [], coverageGoals: [] },
      components: [],
      signals: [],
      clocks: [],
    };

    renderWithProvider(<ComponentDiagram specification={emptySpec} />);

    // Should still render controls
    expect(screen.getByText("Expand All")).toBeInTheDocument();
  });

  it("should display component type labels", () => {
    const { container } = renderWithProvider(
      <ComponentDiagram specification={mockSpecification} />,
    );

    const svg = container.querySelector("svg");
    if (svg) {
      const texts = Array.from(svg.querySelectorAll("text"));
      const hasTypeLabel = texts.some((text) =>
        ["ENV", "AGENT", "DRIVER", "MONITOR"].includes(
          text.textContent || "",
        ),
      );
      expect(hasTypeLabel).toBe(true);
    }
  });

  it("should render connection edges", () => {
    const { container } = renderWithProvider(
      <ComponentDiagram specification={mockSpecification} />,
    );

    const svg = container.querySelector("svg");
    if (svg) {
      // Check for path elements (edges)
      const paths = svg.querySelectorAll("path");
      expect(paths.length).toBeGreaterThan(0);
    }
  });
});
