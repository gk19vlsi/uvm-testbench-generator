/**
 * VCD File Upload Component Example
 * Demonstrates how to use the VCDFileUpload component
 */

import { useState } from "react";
import VCDFileUpload from "./VCDFileUpload";
import type { VCDData } from "../types/vcd";

/**
 * Example 1: Basic Usage
 * Simple VCD file upload with console logging
 */
export function BasicVCDUploadExample() {
  const handleVCDParsed = (vcdData: VCDData, filename: string) => {
    console.log("VCD file parsed:", filename);
    console.log("Number of signals:", vcdData.signals.size);
    console.log("Time range:", vcdData.timeRange);
    console.log("Timescale:", vcdData.header.timescale);
  };

  const handleError = (error: string) => {
    console.error("VCD upload error:", error);
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Basic VCD Upload</h2>
      <VCDFileUpload onVCDParsed={handleVCDParsed} onError={handleError} />
    </div>
  );
}

/**
 * Example 2: With State Management
 * Stores parsed VCD data in component state
 */
export function StatefulVCDUploadExample() {
  const [vcdData, setVcdData] = useState<VCDData | null>(null);
  const [filename, setFilename] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleVCDParsed = (data: VCDData, name: string) => {
    setVcdData(data);
    setFilename(name);
    setError("");
  };

  const handleError = (err: string) => {
    setError(err);
    setVcdData(null);
    setFilename("");
  };

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-bold">VCD Upload with State</h2>

      <VCDFileUpload onVCDParsed={handleVCDParsed} onError={handleError} />

      {vcdData && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-800 mb-2">
            Parsed VCD Data: {filename}
          </h3>
          <div className="text-sm text-green-700 space-y-1">
            <p>Signals: {vcdData.signals.size}</p>
            <p>
              Time Range: {vcdData.timeRange.start} - {vcdData.timeRange.end}{" "}
              {vcdData.header.timescale.unit}
            </p>
            <p>
              Timescale: {vcdData.header.timescale.value}
              {vcdData.header.timescale.unit}
            </p>
            <p>Version: {vcdData.header.version}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Example 3: Integration with Waveform Display
 * Uploads VCD and displays waveforms
 */
export function VCDUploadWithWaveformExample() {
  const [vcdData, setVcdData] = useState<VCDData | null>(null);
  const [showWaveforms, setShowWaveforms] = useState(false);

  const handleVCDParsed = (data: VCDData, filename: string) => {
    console.log("Parsed VCD file:", filename);
    setVcdData(data);
    setShowWaveforms(true);
  };

  const handleError = (error: string) => {
    alert(`Error: ${error}`);
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-bold">VCD Upload with Waveform Display</h2>

      <VCDFileUpload onVCDParsed={handleVCDParsed} onError={handleError} />

      {showWaveforms && vcdData && (
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold mb-4">Waveform Display</h3>
          <div className="bg-gray-100 rounded p-4 text-center text-gray-600">
            {/* This is where WaveformDisplay component would be integrated */}
            <p>Waveform display would show {vcdData.signals.size} signals</p>
            <p className="text-sm mt-2">
              Time range: {vcdData.timeRange.start} -{" "}
              {vcdData.timeRange.end} {vcdData.header.timescale.unit}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Example 4: Multiple VCD Files
 * Allows uploading multiple VCD files sequentially
 */
export function MultipleVCDUploadExample() {
  const [uploadedFiles, setUploadedFiles] = useState<
    Array<{ filename: string; data: VCDData }>
  >([]);

  const handleVCDParsed = (data: VCDData, filename: string) => {
    setUploadedFiles((prev) => [...prev, { filename, data }]);
  };

  const handleError = (error: string) => {
    console.error("Upload error:", error);
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-bold">Multiple VCD Files</h2>

      <VCDFileUpload onVCDParsed={handleVCDParsed} onError={handleError} />

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold">Uploaded Files ({uploadedFiles.length})</h3>
          {uploadedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
            >
              <div>
                <p className="font-medium text-sm">{file.filename}</p>
                <p className="text-xs text-gray-600">
                  {file.data.signals.size} signals, {file.data.timeRange.start}-
                  {file.data.timeRange.end} {file.data.header.timescale.unit}
                </p>
              </div>
              <button
                onClick={() => handleRemoveFile(index)}
                className="text-red-600 hover:text-red-700 text-sm"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Example 5: With Custom Validation
 * Adds additional validation before parsing
 */
export function CustomValidationVCDUploadExample() {
  const [validationMessage, setValidationMessage] = useState<string>("");

  const handleVCDParsed = (data: VCDData, filename: string) => {
    // Custom validation: check if file has signals
    if (data.signals.size === 0) {
      setValidationMessage("Warning: VCD file contains no signals");
      return;
    }

    // Custom validation: check time range
    if (data.timeRange.start === data.timeRange.end) {
      setValidationMessage("Warning: VCD file has no time progression");
      return;
    }

    setValidationMessage(`Success: Parsed ${data.signals.size} signals`);
  };

  const handleError = (error: string) => {
    setValidationMessage(`Error: ${error}`);
  };

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-bold">VCD Upload with Custom Validation</h2>

      <VCDFileUpload onVCDParsed={handleVCDParsed} onError={handleError} />

      {validationMessage && (
        <div
          className={`rounded-lg p-4 ${
            validationMessage.startsWith("Error")
              ? "bg-red-50 text-red-700"
              : validationMessage.startsWith("Warning")
                ? "bg-yellow-50 text-yellow-700"
                : "bg-green-50 text-green-700"
          }`}
        >
          <p className="text-sm">{validationMessage}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Example 6: Complete Integration Example
 * Full-featured example with all bells and whistles
 */
export function CompleteVCDUploadExample() {
  const [vcdData, setVcdData] = useState<VCDData | null>(null);
  const [filename, setFilename] = useState<string>("");
  const [selectedSignals, setSelectedSignals] = useState<string[]>([]);

  const handleVCDParsed = (data: VCDData, name: string) => {
    setVcdData(data);
    setFilename(name);
    // Auto-select first 5 signals
    const signalNames = Array.from(data.signals.values())
      .slice(0, 5)
      .map((s) => s.name);
    setSelectedSignals(signalNames);
  };

  const handleError = (error: string) => {
    alert(`Failed to parse VCD file: ${error}`);
  };

  const toggleSignal = (signalName: string) => {
    setSelectedSignals((prev) =>
      prev.includes(signalName)
        ? prev.filter((s) => s !== signalName)
        : [...prev, signalName],
    );
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-bold">Complete VCD Upload Example</h2>

      <VCDFileUpload onVCDParsed={handleVCDParsed} onError={handleError} />

      {vcdData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* VCD Info Panel */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold mb-3">VCD Information</h3>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-gray-600">Filename</dt>
                <dd className="font-medium">{filename}</dd>
              </div>
              <div>
                <dt className="text-gray-600">Signals</dt>
                <dd className="font-medium">{vcdData.signals.size}</dd>
              </div>
              <div>
                <dt className="text-gray-600">Time Range</dt>
                <dd className="font-medium">
                  {vcdData.timeRange.start} - {vcdData.timeRange.end}{" "}
                  {vcdData.header.timescale.unit}
                </dd>
              </div>
              <div>
                <dt className="text-gray-600">Timescale</dt>
                <dd className="font-medium">
                  {vcdData.header.timescale.value}
                  {vcdData.header.timescale.unit}
                </dd>
              </div>
              <div>
                <dt className="text-gray-600">Version</dt>
                <dd className="font-medium">{vcdData.header.version || "N/A"}</dd>
              </div>
            </dl>
          </div>

          {/* Signal Selection Panel */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold mb-3">
              Signal Selection ({selectedSignals.length} selected)
            </h3>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {Array.from(vcdData.signals.values()).map((signal) => (
                <label
                  key={signal.identifier}
                  className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedSignals.includes(signal.name)}
                    onChange={() => toggleSignal(signal.name)}
                    className="rounded"
                  />
                  <span className="text-sm flex-1">{signal.name}</span>
                  <span className="text-xs text-gray-500">
                    {signal.bitWidth} bit
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
