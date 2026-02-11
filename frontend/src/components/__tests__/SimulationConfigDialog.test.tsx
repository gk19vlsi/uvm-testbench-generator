/**
 * Unit tests for SimulationConfigDialog component
 * Tests simulator selection, parameter configuration, and simulation triggering
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import SimulationConfigDialog from "../SimulationConfigDialog";

// Mock fetch
global.fetch = jest.fn();

describe("SimulationConfigDialog", () => {
  const mockOnClose = jest.fn();
  const mockOnSimulationStart = jest.fn();
  const defaultProps = {
    projectId: "test-project-123",
    generationId: "test-gen-456",
    onClose: mockOnClose,
    onSimulationStart: mockOnSimulationStart,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe("Component Rendering", () => {
    it("should render dialog with title and description", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ simulators: [] }),
      });

      render(<SimulationConfigDialog {...defaultProps} />);

      expect(
        screen.getByText("Simulation Configuration"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Configure and run HDL simulation"),
      ).toBeInTheDocument();
    });

    it("should show loading spinner while fetching simulators", () => {
      (global.fetch as jest.Mock).mockImplementation(
        () =>
          new Promise(() => {
            /* never resolves */
          }),
      );

      render(<SimulationConfigDialog {...defaultProps} />);

      const spinner = document.querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
    });

    it("should display available simulators after loading", async () => {
      const mockSimulators = [
        {
          type: "modelsim",
          available: true,
          version: "10.5",
          executable: "vsim",
        },
        {
          type: "vcs",
          available: false,
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ simulators: mockSimulators }),
      });

      render(<SimulationConfigDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("ModelSim")).toBeInTheDocument();
        expect(screen.getByText("VCS")).toBeInTheDocument();
      });
    });
  });

  describe("Simulator Selection", () => {
    it("should auto-select first available simulator", async () => {
      const mockSimulators = [
        {
          type: "modelsim",
          available: true,
          version: "10.5",
        },
        {
          type: "vcs",
          available: true,
          version: "2021.09",
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ simulators: mockSimulators }),
      });

      render(<SimulationConfigDialog {...defaultProps} />);

      await waitFor(() => {
        const modelsimRadio = screen.getByRole("radio", {
          name: /modelsim/i,
        }) as HTMLInputElement;
        expect(modelsimRadio.checked).toBe(true);
      });
    });

    it("should allow selecting different simulator", async () => {
      const mockSimulators = [
        { type: "modelsim", available: true },
        { type: "vcs", available: true },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ simulators: mockSimulators }),
      });

      render(<SimulationConfigDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("ModelSim")).toBeInTheDocument();
      });

      const vcsRadio = screen.getByRole("radio", {
        name: /vcs/i,
      }) as HTMLInputElement;
      fireEvent.click(vcsRadio);

      expect(vcsRadio.checked).toBe(true);
    });

    it("should disable unavailable simulators", async () => {
      const mockSimulators = [
        { type: "modelsim", available: true },
        { type: "vcs", available: false },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ simulators: mockSimulators }),
      });

      render(<SimulationConfigDialog {...defaultProps} />);

      await waitFor(() => {
        const vcsRadio = screen.getByRole("radio", {
          name: /vcs/i,
        }) as HTMLInputElement;
        expect(vcsRadio.disabled).toBe(true);
      });
    });

    it("should show error when no simulators available", async () => {
      const mockSimulators = [
        { type: "modelsim", available: false },
        { type: "vcs", available: false },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ simulators: mockSimulators }),
      });

      render(<SimulationConfigDialog {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getByText(/No simulators detected/i),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Parameter Configuration", () => {
    it("should have default runtime value", async () => {
      const mockSimulators = [{ type: "modelsim", available: true }];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ simulators: mockSimulators }),
      });

      render(<SimulationConfigDialog {...defaultProps} />);

      await waitFor(() => {
        const runtimeInput = screen.getByLabelText(/runtime/i) as HTMLInputElement;
        expect(runtimeInput.value).toBe("1000ns");
      });
    });

    it("should have default timescale value", async () => {
      const mockSimulators = [{ type: "modelsim", available: true }];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ simulators: mockSimulators }),
      });

      render(<SimulationConfigDialog {...defaultProps} />);

      await waitFor(() => {
        const timescaleInput = screen.getByLabelText(/timescale/i) as HTMLInputElement;
        expect(timescaleInput.value).toBe("1ns/1ps");
      });
    });

    it("should allow changing runtime", async () => {
      const mockSimulators = [{ type: "modelsim", available: true }];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ simulators: mockSimulators }),
      });

      render(<SimulationConfigDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/runtime/i)).toBeInTheDocument();
      });

      const runtimeInput = screen.getByLabelText(/runtime/i) as HTMLInputElement;
      fireEvent.change(runtimeInput, { target: { value: "5000ns" } });

      expect(runtimeInput.value).toBe("5000ns");
    });

    it("should allow changing timescale", async () => {
      const mockSimulators = [{ type: "modelsim", available: true }];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ simulators: mockSimulators }),
      });

      render(<SimulationConfigDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/timescale/i)).toBeInTheDocument();
      });

      const timescaleInput = screen.getByLabelText(/timescale/i) as HTMLInputElement;
      fireEvent.change(timescaleInput, { target: { value: "1ps/1fs" } });

      expect(timescaleInput.value).toBe("1ps/1fs");
    });

    it("should allow entering plusargs", async () => {
      const mockSimulators = [{ type: "modelsim", available: true }];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ simulators: mockSimulators }),
      });

      render(<SimulationConfigDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/plusargs/i)).toBeInTheDocument();
      });

      const plusargsInput = screen.getByLabelText(/plusargs/i) as HTMLInputElement;
      fireEvent.change(plusargsInput, {
        target: { value: "UVM_TESTNAME=my_test, UVM_VERBOSITY=UVM_HIGH" },
      });

      expect(plusargsInput.value).toBe(
        "UVM_TESTNAME=my_test, UVM_VERBOSITY=UVM_HIGH",
      );
    });
  });

  describe("Simulation Triggering", () => {
    it("should trigger simulation with correct parameters", async () => {
      const mockSimulators = [{ type: "modelsim", available: true }];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ simulators: mockSimulators }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ jobId: "sim-job-789" }),
        });

      render(<SimulationConfigDialog {...defaultProps} />);

      // Wait for simulators to load
      await waitFor(() => {
        expect(screen.getByText("ModelSim")).toBeInTheDocument();
      });

      // Wait for button to be enabled
      await waitFor(() => {
        const startButton = screen.getByText("Start Simulation");
        expect(startButton).not.toBeDisabled();
      });

      const startButton = screen.getByText("Start Simulation");
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });

      expect(global.fetch).toHaveBeenCalledWith(
        `/api/projects/${defaultProps.projectId}/simulate`,
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: expect.stringContaining("modelsim"),
        }),
      );
    });

    it("should call onSimulationStart callback on success", async () => {
      const mockSimulators = [{ type: "modelsim", available: true }];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ simulators: mockSimulators }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ jobId: "sim-job-789" }),
        });

      render(<SimulationConfigDialog {...defaultProps} />);

      // Wait for simulators to load
      await waitFor(() => {
        expect(screen.getByText("ModelSim")).toBeInTheDocument();
      });

      // Wait for button to be enabled
      await waitFor(() => {
        const startButton = screen.getByText("Start Simulation");
        expect(startButton).not.toBeDisabled();
      });

      const startButton = screen.getByText("Start Simulation");
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(mockOnSimulationStart).toHaveBeenCalledWith("sim-job-789");
      });
    });

    it("should close dialog after successful start", async () => {
      const mockSimulators = [{ type: "modelsim", available: true }];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ simulators: mockSimulators }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ jobId: "sim-job-789" }),
        });

      render(<SimulationConfigDialog {...defaultProps} />);

      // Wait for simulators to load
      await waitFor(() => {
        expect(screen.getByText("ModelSim")).toBeInTheDocument();
      });

      // Wait for button to be enabled
      await waitFor(() => {
        const startButton = screen.getByText("Start Simulation");
        expect(startButton).not.toBeDisabled();
      });

      const startButton = screen.getByText("Start Simulation");
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it("should show error on simulation start failure", async () => {
      const mockSimulators = [{ type: "modelsim", available: true }];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ simulators: mockSimulators }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ message: "Simulation failed to start" }),
        });

      render(<SimulationConfigDialog {...defaultProps} />);

      // Wait for simulators to load
      await waitFor(() => {
        expect(screen.getByText("ModelSim")).toBeInTheDocument();
      });

      // Wait for button to be enabled
      await waitFor(() => {
        const startButton = screen.getByText("Start Simulation");
        expect(startButton).not.toBeDisabled();
      });

      const startButton = screen.getByText("Start Simulation");
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(
          screen.getByText(/Simulation failed to start/i),
        ).toBeInTheDocument();
      });
    });

    it("should parse plusargs correctly", async () => {
      const mockSimulators = [{ type: "modelsim", available: true }];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ simulators: mockSimulators }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ jobId: "sim-job-789" }),
        });

      render(<SimulationConfigDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/plusargs/i)).toBeInTheDocument();
      });

      const plusargsInput = screen.getByLabelText(/plusargs/i);
      fireEvent.change(plusargsInput, {
        target: { value: "ARG1=value1, ARG2=value2, ARG3=value3" },
      });

      const startButton = screen.getByText("Start Simulation");
      fireEvent.click(startButton);

      await waitFor(() => {
        const callBody = JSON.parse(
          (global.fetch as jest.Mock).mock.calls[1][1].body,
        );
        expect(callBody.plusargs).toEqual([
          "ARG1=value1",
          "ARG2=value2",
          "ARG3=value3",
        ]);
      });
    });
  });

  describe("Dialog Controls", () => {
    it("should close dialog when cancel button clicked", async () => {
      const mockSimulators = [{ type: "modelsim", available: true }];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ simulators: mockSimulators }),
      });

      render(<SimulationConfigDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Cancel")).toBeInTheDocument();
      });

      const cancelButton = screen.getByText("Cancel");
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it("should close dialog when X button clicked", async () => {
      const mockSimulators = [{ type: "modelsim", available: true }];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ simulators: mockSimulators }),
      });

      render(<SimulationConfigDialog {...defaultProps} />);

      await waitFor(() => {
        const closeButton = screen.getByRole("button", { name: "" });
        expect(closeButton).toBeInTheDocument();
      });

      const closeButtons = screen.getAllByRole("button");
      const xButton = closeButtons.find((btn) =>
        btn.querySelector("svg path[d*='4.293']"),
      );

      if (xButton) {
        fireEvent.click(xButton);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });

    it("should disable start button when no simulator selected", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ simulators: [] }),
      });

      render(<SimulationConfigDialog {...defaultProps} />);

      await waitFor(() => {
        const startButton = screen.getByText("Start Simulation");
        expect(startButton).toBeDisabled();
      });
    });
  });

  describe("Error Handling", () => {
    it("should show error when fetch fails", async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Network error"),
      );

      render(<SimulationConfigDialog {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getByText(/Failed to connect to backend/i),
        ).toBeInTheDocument();
      });
    });

    it("should validate runtime is not empty", async () => {
      const mockSimulators = [{ type: "modelsim", available: true }];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ simulators: mockSimulators }),
      });

      render(<SimulationConfigDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/runtime/i)).toBeInTheDocument();
      });

      const runtimeInput = screen.getByLabelText(/runtime/i);
      fireEvent.change(runtimeInput, { target: { value: "" } });

      const startButton = screen.getByText("Start Simulation");
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(
          screen.getByText(/Please specify simulation runtime/i),
        ).toBeInTheDocument();
      });
    });

    it("should validate timescale is not empty", async () => {
      const mockSimulators = [{ type: "modelsim", available: true }];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ simulators: mockSimulators }),
      });

      render(<SimulationConfigDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/timescale/i)).toBeInTheDocument();
      });

      const timescaleInput = screen.getByLabelText(/timescale/i);
      fireEvent.change(timescaleInput, { target: { value: "" } });

      const startButton = screen.getByText("Start Simulation");
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(
          screen.getByText(/Please specify timescale/i),
        ).toBeInTheDocument();
      });
    });
  });
});
