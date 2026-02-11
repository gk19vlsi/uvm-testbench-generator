/**
 * Visualization Panel Component
 * Main panel integrating all visualization features
 */

import React, { useState } from "react";
import { SimulationProvider } from "../contexts/SimulationContext";
import { SimulationEngine } from "../services/SimulationEngine";
import WaveformDisplay from "./WaveformDisplay";
import ComponentDiagram from "./ComponentDiagram";
import SimulationControls from "./SimulationControls";
import ProgressIndicator from "./ProgressIndicator";
import Timeline from "./Timeline";
import VCDFileUpload from "./VCDFileUpload";
import SimulationRunner from "./SimulationRunner";
import { VCDParser } from "../services/VCDParser";
import { TestbenchSpecification, Signal, SignalData } from "../types/simulation";
import { VCDData } from "../types/vcd";

interface VisualizationPanelProps {
  projectId: string;
  generationId?: string;
  specification: TestbenchSpecification;
  signals?: Signal[];
  signalData?: SignalData[];
  className?: string;
}

type TabType = "waveform" | "component" | "timeline" | "simulation";

const VisualizationPanel: React.FC<VisualizationPanelProps> = ({
  projectId,
  generationId,
  specification,
  signals = [],
  signalData = [],
  className = "",
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("simulation");
  const [engine] = useState(() => new SimulationEngine());
  
  // VCD data state
  const [vcdData, setVcdData] = useState<VCDData | null>(null);
  const [vcdFilename, setVcdFilename] = useState<string | null>(null);
  const [vcdSignals, setVcdSignals] = useState<Signal[]>([]);
  const [vcdSignalData, setVcdSignalData] = useState<SignalData[]>([]);
  const [showVcdUpload, setShowVcdUpload] = useState(false);

  const tabs: Array<{ id: TabType; label: string; icon: string }> = [
    { id: "simulation", label: "Run Simulation", icon: "▶️" },
    { id: "waveform", label: "Waveform", icon: "📊" },
    { id: "component", label: "Component Diagram", icon: "🔷" },
    { id: "timeline", label: "Timeline", icon: "⏱️" },
  ];

  // Handle VCD file parsed
  const handleVCDParsed = (parsedVcdData: VCDData, filename: string) => {
    console.log("[VCD] Parsed VCD file:", filename);
    console.log("[VCD] Signals:", parsedVcdData.signals.size);
    console.log("[VCD] Time range:", parsedVcdData.timeRange);
    console.log("[VCD] Timescale:", parsedVcdData.header.timescale);

    setVcdData(parsedVcdData);
    setVcdFilename(filename);

    // Convert VCD data to waveform format
    const parser = new VCDParser();
    const waveforms = parser.convertToWaveform(parsedVcdData);

    // Convert to Signal[] format
    const convertedSignals: Signal[] = [];
    parsedVcdData.signals.forEach((vcdSignal, identifier) => {
      convertedSignals.push({
        id: vcdSignal.name,
        name: vcdSignal.name,
        type: vcdSignal.type === "wire" || vcdSignal.type === "reg" ? "data" : "control",
        color: getSignalColor(vcdSignal.type),
        bitWidth: vcdSignal.bitWidth,
      });
    });

    // Convert to SignalData[] format
    const convertedSignalData: SignalData[] = [];
    waveforms.forEach((timeSeries, signalName) => {
      convertedSignalData.push({
        signalId: signalName,
        transitions: timeSeries.transitions,
      });
    });

    setVcdSignals(convertedSignals);
    setVcdSignalData(convertedSignalData);
    setShowVcdUpload(false);

    console.log("[VCD] Converted to", convertedSignals.length, "signals");
    
    // Switch to waveform tab
    setActiveTab("waveform");
  };

  // Handle VCD parse error
  const handleVCDError = (error: string) => {
    console.error("[VCD] Parse error:", error);
    // Error is already displayed in VCDFileUpload component
  };

  // Handle VCD loaded from simulation
  const handleSimulationVCDLoaded = (
    parsedVcdData: VCDData,
    convertedSignals: Signal[],
    convertedSignalData: SignalData[]
  ) => {
    setVcdData(parsedVcdData);
    setVcdSignals(convertedSignals);
    setVcdSignalData(convertedSignalData);
    setVcdFilename("simulation.vcd");
    
    // Switch to waveform tab
    setActiveTab("waveform");
  };

  // Get signal color based on type
  const getSignalColor = (type: string): string => {
    switch (type) {
      case "wire":
      case "reg":
        return "#3b82f6"; // blue for data signals
      case "integer":
        return "#8b5cf6"; // purple for integers
      case "real":
        return "#ec4899"; // pink for real numbers
      default:
        return "#6b7280"; // gray for others
    }
  };

  // Determine which signals and data to display
  const displaySignals = vcdSignals.length > 0 ? vcdSignals : signals;
  const displaySignalData = vcdSignalData.length > 0 ? vcdSignalData : signalData;

  return (
    <SimulationProvider engine={engine} projectId={projectId}>
      <div className={`flex flex-col space-y-4 ${className}`}>
        {/* Header with Progress Indicator */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Simulation Visualization
            </h2>
            <ProgressIndicator />
          </div>

          {/* Simulation Controls */}
          <SimulationControls engine={engine} />
        </div>

        {/* Tab Navigation */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-1 p-2" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md
                    transition-colors duration-200
                    ${
                      activeTab === tab.id
                        ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }
                  `}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "simulation" && generationId && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  HDL Simulation
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Run simulation with your preferred simulator and automatically visualize waveforms.
                </p>
                <SimulationRunner
                  projectId={projectId}
                  generationId={generationId}
                  onVCDLoaded={handleSimulationVCDLoaded}
                />
              </div>
            )}

            {activeTab === "waveform" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    Signal Waveforms
                  </h3>
                  <div className="flex items-center space-x-4">
                    {vcdData && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Timescale:</span>{" "}
                        {vcdData.header.timescale.value}
                        {vcdData.header.timescale.unit}
                        {vcdFilename && (
                          <span className="ml-3">
                            <span className="font-medium">File:</span> {vcdFilename}
                          </span>
                        )}
                      </div>
                    )}
                    <button
                      onClick={() => setShowVcdUpload(!showVcdUpload)}
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700 dark:hover:bg-blue-800"
                    >
                      <svg
                        className="w-4 h-4 mr-1.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                      Upload VCD File
                    </button>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {displaySignals.length} signal{displaySignals.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                {/* VCD File Upload Section */}
                {showVcdUpload && (
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <VCDFileUpload
                      onVCDParsed={handleVCDParsed}
                      onError={handleVCDError}
                    />
                  </div>
                )}

                {displaySignals.length > 0 ? (
                  <WaveformDisplay signals={displaySignals} signalData={displaySignalData} />
                ) : (
                  <div className="flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
                    <div className="text-center">
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                        No signals available
                      </h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Upload a VCD file or generate a testbench to see signal waveforms
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "component" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    UVM Component Hierarchy
                  </h3>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {specification.components.length} component
                    {specification.components.length !== 1 ? "s" : ""}
                  </span>
                </div>
                {specification.components.length > 0 ? (
                  <ComponentDiagram specification={specification} />
                ) : (
                  <div className="flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
                    <div className="text-center">
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                        />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                        No components available
                      </h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Generate a testbench to see component diagram
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "timeline" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    Simulation Timeline
                  </h3>
                </div>
                <Timeline />
              </div>
            )}
          </div>
        </div>
      </div>
    </SimulationProvider>
  );
};

export default VisualizationPanel;
