/**
 * VCD File Upload Component Tests
 * Tests for VCD file upload with drag-and-drop and progress tracking
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import VCDFileUpload from "../VCDFileUpload";
import { VCDParser } from "../../services/VCDParser";
import type { VCDData } from "../../types/vcd";

// Mock VCDParser
jest.mock("../../services/VCDParser");

describe("VCDFileUpload", () => {
  const mockOnVCDParsed = jest.fn();
  const mockOnError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  // Helper function to create a File with mocked text() method
  const createMockFile = (content: string, filename: string): File => {
    const file = new File([content], filename, { type: "text/plain" });
    Object.defineProperty(file, 'text', {
      value: jest.fn().mockResolvedValue(content),
      writable: true,
    });
    return file;
  };

  it("renders upload area", () => {
    render(<VCDFileUpload onVCDParsed={mockOnVCDParsed} />);

    expect(screen.getByText("VCD File Upload")).toBeInTheDocument();
    expect(screen.getByText("Click to upload")).toBeInTheDocument();
    expect(
      screen.getByText("VCD files from simulation tools (max 500MB)"),
    ).toBeInTheDocument();
  });

  it("accepts file input", () => {
    render(<VCDFileUpload onVCDParsed={mockOnVCDParsed} />);

    const input = screen.getByLabelText("Click to upload") as HTMLInputElement;
    expect(input).toHaveAttribute("type", "file");
    expect(input).toHaveAttribute("accept", ".vcd");
  });

  it("validates file size", async () => {
    render(
      <VCDFileUpload
        onVCDParsed={mockOnVCDParsed}
        onError={mockOnError}
      />,
    );

    // Create a large file (>500MB) - use Object.defineProperty to mock size
    const largeFile = new File(["content"], "large.vcd", {
      type: "text/plain",
    });
    Object.defineProperty(largeFile, "size", {
      value: 501 * 1024 * 1024,
      writable: false,
    });

    const input = screen.getByLabelText("Click to upload") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [largeFile] } });

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(
        expect.stringContaining("exceeds 500MB limit"),
      );
    });
  });

  it("validates file extension", async () => {
    render(
      <VCDFileUpload
        onVCDParsed={mockOnVCDParsed}
        onError={mockOnError}
      />,
    );

    const invalidFile = new File(["content"], "test.txt", {
      type: "text/plain",
    });

    const input = screen.getByLabelText("Click to upload") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [invalidFile] } });

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(
        expect.stringContaining("Unsupported file format"),
      );
    });
  });

  it("handles successful file upload and parsing", async () => {
    const mockVCDData: VCDData = {
      header: {
        date: "2024-01-01",
        version: "1.0",
        timescale: { value: 1, unit: "ns" },
        comment: "Test",
      },
      signals: new Map(),
      valueChanges: new Map(),
      timeRange: { start: 0, end: 100 },
    };

    // Mock VCDParser implementation
    const mockParseFile = jest.fn().mockResolvedValue(mockVCDData);
    const mockSetProgressCallback = jest.fn((callback) => {
      // Simulate progress updates
      setTimeout(() => callback({ phase: "header", percentage: 25, bytesProcessed: 25, totalBytes: 100 }), 10);
      setTimeout(() => callback({ phase: "definitions", percentage: 50, bytesProcessed: 50, totalBytes: 100 }), 20);
      setTimeout(() => callback({ phase: "values", percentage: 75, bytesProcessed: 75, totalBytes: 100 }), 30);
      setTimeout(() => callback({ phase: "complete", percentage: 100, bytesProcessed: 100, totalBytes: 100 }), 40);
    });

    (VCDParser as jest.Mock).mockImplementation(() => ({
      parseFile: mockParseFile,
      setProgressCallback: mockSetProgressCallback,
    }));

    render(<VCDFileUpload onVCDParsed={mockOnVCDParsed} />);

    const validFile = new File(["vcd content"], "test.vcd", {
      type: "text/plain",
    });

    const input = screen.getByLabelText("Click to upload") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [validFile] } });

    // Wait for parsing to complete
    await waitFor(
      () => {
        expect(mockOnVCDParsed).toHaveBeenCalledWith(mockVCDData, "test.vcd");
      },
      { timeout: 3000 },
    );

    // Check success message
    expect(screen.getByText("VCD file parsed successfully")).toBeInTheDocument();
  });

  it("shows progress during parsing", async () => {
    const mockVCDData: VCDData = {
      header: {
        date: "2024-01-01",
        version: "1.0",
        timescale: { value: 1, unit: "ns" },
        comment: "Test",
      },
      signals: new Map(),
      valueChanges: new Map(),
      timeRange: { start: 0, end: 100 },
    };

    let progressCallback: any;
    const mockParseFile = jest.fn().mockImplementation(() => {
      return new Promise((resolve) => {
        // Call progress callback immediately before resolving
        if (progressCallback) {
          progressCallback({ phase: "header", percentage: 50, bytesProcessed: 50, totalBytes: 100 });
        }
        setTimeout(() => {
          resolve(mockVCDData);
        }, 50);
      });
    });

    const mockSetProgressCallback = jest.fn((callback) => {
      progressCallback = callback;
    });

    (VCDParser as jest.Mock).mockImplementation(() => ({
      parseFile: mockParseFile,
      setProgressCallback: mockSetProgressCallback,
    }));

    render(<VCDFileUpload onVCDParsed={mockOnVCDParsed} />);

    const validFile = new File(["vcd content"], "test.vcd", {
      type: "text/plain",
    });

    const input = screen.getByLabelText("Click to upload") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [validFile] } });

    // Check that progress is shown
    await waitFor(() => {
      expect(screen.getByText("Parsing header...")).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it("handles parsing errors", async () => {
    const mockError = new Error("Invalid VCD format");
    const mockParseFile = jest.fn().mockRejectedValue(mockError);
    const mockSetProgressCallback = jest.fn();

    (VCDParser as jest.Mock).mockImplementation(() => ({
      parseFile: mockParseFile,
      setProgressCallback: mockSetProgressCallback,
    }));

    render(
      <VCDFileUpload
        onVCDParsed={mockOnVCDParsed}
        onError={mockOnError}
      />,
    );

    const validFile = new File(["invalid vcd"], "test.vcd", {
      type: "text/plain",
    });

    const input = screen.getByLabelText("Click to upload") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith("Invalid VCD format");
    });

    expect(screen.getByText("Invalid VCD format")).toBeInTheDocument();
  });

  it("supports drag and drop", () => {
    render(<VCDFileUpload onVCDParsed={mockOnVCDParsed} />);

    const dropZone = screen.getByText("Click to upload").closest("div")!.parentElement!;

    // Simulate drag over
    fireEvent.dragOver(dropZone);
    expect(dropZone).toHaveClass("border-blue-500");

    // Simulate drag leave
    fireEvent.dragLeave(dropZone);
    expect(dropZone).not.toHaveClass("border-blue-500");
  });

  it("allows reset after error", async () => {
    render(
      <VCDFileUpload
        onVCDParsed={mockOnVCDParsed}
        onError={mockOnError}
      />,
    );

    const invalidFile = new File(["content"], "test.txt", {
      type: "text/plain",
    });

    const input = screen.getByLabelText("Click to upload") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [invalidFile] } });

    await waitFor(() => {
      expect(screen.getByText("Try Again")).toBeInTheDocument();
    });

    // Click try again
    fireEvent.click(screen.getByText("Try Again"));

    // Error should be cleared
    expect(screen.queryByText("Unsupported file format")).not.toBeInTheDocument();
  });

  it("allows upload new file after success", async () => {
    const mockVCDData: VCDData = {
      header: {
        date: "2024-01-01",
        version: "1.0",
        timescale: { value: 1, unit: "ns" },
        comment: "Test",
      },
      signals: new Map(),
      valueChanges: new Map(),
      timeRange: { start: 0, end: 100 },
    };

    const mockParseFile = jest.fn().mockResolvedValue(mockVCDData);
    const mockSetProgressCallback = jest.fn();

    (VCDParser as jest.Mock).mockImplementation(() => ({
      parseFile: mockParseFile,
      setProgressCallback: mockSetProgressCallback,
    }));

    render(<VCDFileUpload onVCDParsed={mockOnVCDParsed} />);

    const validFile = new File(["vcd content"], "test.vcd", {
      type: "text/plain",
    });

    const input = screen.getByLabelText("Click to upload") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(screen.getByText("Upload New")).toBeInTheDocument();
    });

    // Click upload new
    fireEvent.click(screen.getByText("Upload New"));

    // Success message should be cleared
    expect(screen.queryByText("VCD file parsed successfully")).not.toBeInTheDocument();
  });

  // Requirement 9.5: Display parsing errors with line numbers
  it("displays parsing errors with line numbers", async () => {
    const mockError = new Error("VCD parsing failed with 2 error(s)");
    const mockParseFile = jest.fn().mockRejectedValue(mockError);
    const mockSetProgressCallback = jest.fn();
    const mockValidate = jest.fn().mockReturnValue({
      isValid: false,
      errors: [
        {
          line: 15,
          message: "Invalid $var declaration",
          severity: "error",
          suggestion: "Expected format: $var <type> <size> <identifier> <name> $end",
        },
        {
          line: 42,
          message: "Unterminated $date section",
          severity: "error",
          suggestion: "Add $end after the date declaration.",
        },
      ],
      warnings: [],
    });

    (VCDParser as jest.Mock).mockImplementation(() => ({
      parseFile: mockParseFile,
      setProgressCallback: mockSetProgressCallback,
      validate: mockValidate,
    }));

    render(
      <VCDFileUpload
        onVCDParsed={mockOnVCDParsed}
        onError={mockOnError}
      />,
    );

    const invalidFile = createMockFile("invalid vcd content", "test.vcd");

    const input = screen.getByLabelText("Click to upload") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [invalidFile] } });

    await waitFor(() => {
      // Check that error count is displayed
      expect(screen.getByText(/Parse Errors \(2\):/)).toBeInTheDocument();
    }, { timeout: 3000 });
    
    // Check that line numbers are displayed
    expect(screen.getByText("Line 15:")).toBeInTheDocument();
    expect(screen.getByText("Line 42:")).toBeInTheDocument();
    
    // Check that error messages are displayed
    expect(screen.getByText("Invalid $var declaration")).toBeInTheDocument();
    expect(screen.getByText("Unterminated $date section")).toBeInTheDocument();
  });

  // Requirement 9.5: Show clear error messages for invalid VCD files
  it("shows clear error messages for invalid VCD files", async () => {
    const mockError = new Error("VCD parsing failed");
    const mockParseFile = jest.fn().mockRejectedValue(mockError);
    const mockSetProgressCallback = jest.fn();
    const mockValidate = jest.fn().mockReturnValue({
      isValid: false,
      errors: [
        {
          line: 1,
          message: "VCD file is empty",
          severity: "error",
          suggestion: "Ensure the VCD file contains valid simulation data.",
        },
      ],
      warnings: [],
    });

    (VCDParser as jest.Mock).mockImplementation(() => ({
      parseFile: mockParseFile,
      setProgressCallback: mockSetProgressCallback,
      validate: mockValidate,
    }));

    render(
      <VCDFileUpload
        onVCDParsed={mockOnVCDParsed}
        onError={mockOnError}
      />,
    );

    const emptyFile = createMockFile("", "empty.vcd");

    const input = screen.getByLabelText("Click to upload") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [emptyFile] } });

    await waitFor(() => {
      // Check main error message
      expect(screen.getByText("VCD parsing failed")).toBeInTheDocument();
    }, { timeout: 3000 });
    
    // Check detailed error message
    expect(screen.getByText("VCD file is empty")).toBeInTheDocument();
  });

  // Requirement 9.5: Provide suggestions for fixing common VCD format issues
  it("provides suggestions for fixing common VCD format issues", async () => {
    const mockError = new Error("VCD parsing failed");
    const mockParseFile = jest.fn().mockRejectedValue(mockError);
    const mockSetProgressCallback = jest.fn();
    const mockValidate = jest.fn().mockReturnValue({
      isValid: false,
      errors: [
        {
          line: 10,
          message: "Invalid timescale format",
          severity: "error",
          suggestion: "Expected format: $timescale <value> <unit> $end (e.g., $timescale 1ns $end)",
        },
        {
          line: 25,
          message: "Missing $enddefinitions",
          severity: "error",
          suggestion: "VCD file must have $enddefinitions $end to mark the end of signal definitions.",
        },
      ],
      warnings: [
        {
          line: 5,
          message: "No timescale declaration found",
          severity: "warning",
          suggestion: "Add $timescale declaration in the header (e.g., $timescale 1ns $end). Using default: 1ns",
        },
      ],
    });

    (VCDParser as jest.Mock).mockImplementation(() => ({
      parseFile: mockParseFile,
      setProgressCallback: mockSetProgressCallback,
      validate: mockValidate,
    }));

    render(
      <VCDFileUpload
        onVCDParsed={mockOnVCDParsed}
        onError={mockOnError}
      />,
    );

    const invalidFile = createMockFile("invalid vcd", "test.vcd");

    const input = screen.getByLabelText("Click to upload") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [invalidFile] } });

    await waitFor(() => {
      // Check that common issues help section is displayed
      expect(screen.getByText("Common VCD Format Issues:")).toBeInTheDocument();
    }, { timeout: 3000 });
    
    // Check that suggestions are displayed with lightbulb emoji
    expect(screen.getByText(/💡 Expected format: \$timescale/)).toBeInTheDocument();
    expect(screen.getByText(/💡 VCD file must have \$enddefinitions/)).toBeInTheDocument();
    
    // Check common issues list (use getAllByText since text appears in both error message and common issues list)
    const timescaleMatches = screen.getAllByText(/Invalid timescale format/);
    expect(timescaleMatches.length).toBeGreaterThan(0);
    
    const enddefinitionsMatches = screen.getAllByText(/Missing \$enddefinitions/);
    expect(enddefinitionsMatches.length).toBeGreaterThan(0);
    
    // Check that warnings are also displayed
    expect(screen.getByText(/Warnings \(1\):/)).toBeInTheDocument();
    expect(screen.getByText("No timescale declaration found")).toBeInTheDocument();
  });

  // Requirement 9.5: Display multiple errors with proper formatting
  it("displays multiple errors with proper formatting and scrolling", async () => {
    const mockError = new Error("VCD parsing failed with 12 error(s)");
    const mockParseFile = jest.fn().mockRejectedValue(mockError);
    const mockSetProgressCallback = jest.fn();
    
    // Create 12 errors to test the "show more" functionality
    const errors = Array.from({ length: 12 }, (_, i) => ({
      line: i + 1,
      message: `Error at line ${i + 1}`,
      severity: "error" as const,
      suggestion: `Fix suggestion for line ${i + 1}`,
    }));
    
    const mockValidate = jest.fn().mockReturnValue({
      isValid: false,
      errors,
      warnings: [],
    });

    (VCDParser as jest.Mock).mockImplementation(() => ({
      parseFile: mockParseFile,
      setProgressCallback: mockSetProgressCallback,
      validate: mockValidate,
    }));

    render(
      <VCDFileUpload
        onVCDParsed={mockOnVCDParsed}
        onError={mockOnError}
      />,
    );

    const invalidFile = createMockFile("invalid vcd", "test.vcd");

    const input = screen.getByLabelText("Click to upload") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [invalidFile] } });

    await waitFor(() => {
      // Check that error count is displayed
      expect(screen.getByText(/Parse Errors \(12\):/)).toBeInTheDocument();
    }, { timeout: 3000 });
    
    // Check that only first 10 errors are shown
    expect(screen.getByText("Line 1:")).toBeInTheDocument();
    expect(screen.getByText("Line 10:")).toBeInTheDocument();
    
    // Check that "and X more" message is displayed
    expect(screen.getByText(/\.\.\. and 2 more error\(s\)/)).toBeInTheDocument();
  });

  // Requirement 9.5: Handle warnings separately from errors
  it("displays warnings separately from errors", async () => {
    const mockError = new Error("VCD parsing failed");
    const mockParseFile = jest.fn().mockRejectedValue(mockError);
    const mockSetProgressCallback = jest.fn();
    const mockValidate = jest.fn().mockReturnValue({
      isValid: false,
      errors: [
        {
          line: 20,
          message: "Invalid timestamp",
          severity: "error",
          suggestion: "Timestamps must be numeric values (e.g., #0, #10, #100)",
        },
      ],
      warnings: [
        {
          line: 5,
          message: "No timescale declaration found",
          severity: "warning",
          suggestion: "Add $timescale declaration in the header",
        },
        {
          line: 30,
          message: "Duplicate signal identifier",
          severity: "warning",
          suggestion: "Each signal must have a unique identifier code.",
        },
      ],
    });

    (VCDParser as jest.Mock).mockImplementation(() => ({
      parseFile: mockParseFile,
      setProgressCallback: mockSetProgressCallback,
      validate: mockValidate,
    }));

    render(
      <VCDFileUpload
        onVCDParsed={mockOnVCDParsed}
        onError={mockOnError}
      />,
    );

    const invalidFile = createMockFile("invalid vcd", "test.vcd");

    const input = screen.getByLabelText("Click to upload") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [invalidFile] } });

    await waitFor(() => {
      // Check errors section
      expect(screen.getByText(/Parse Errors \(1\):/)).toBeInTheDocument();
    }, { timeout: 3000 });
    
    expect(screen.getByText("Invalid timestamp")).toBeInTheDocument();
    
    // Check warnings section
    expect(screen.getByText(/Warnings \(2\):/)).toBeInTheDocument();
    expect(screen.getByText("No timescale declaration found")).toBeInTheDocument();
    expect(screen.getByText("Duplicate signal identifier")).toBeInTheDocument();
  });
});
