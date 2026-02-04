/**
 * Component Details Panel
 * Displays detailed information about a selected UVM component
 * including code preview with syntax highlighting
 */

import { useState, useEffect } from "react";
import { getFileContent } from "../services/projectService";
import { downloadIndividualFile } from "./DownloadManager";
import type { UVMTreeNode } from "../types";

interface ComponentDetailsPanelProps {
  projectId: string;
  node: UVMTreeNode;
  onClose: () => void;
  onOpenInEditor?: (node: UVMTreeNode, content: string) => void;
}

const ComponentDetailsPanel: React.FC<ComponentDetailsPanelProps> = ({
  projectId,
  node,
  onClose,
  onOpenInEditor,
}) => {
  const [code, setCode] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const loadCode = async () => {
      if (!node.filePath) {
        setCode("");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const fileData = await getFileContent(projectId, node.filePath);
        setCode(fileData.content);
      } catch (err) {
        console.error("Failed to load file content:", err);
        setError("Failed to load file content");
        // Use mock code for development
        setCode(getMockCode(node.type));
      } finally {
        setIsLoading(false);
      }
    };

    loadCode();
  }, [projectId, node.filePath, node.type]);

  const getMockCode = (type: string): string => {
    const mockCodeMap: Record<string, string> = {
      driver: `class axi_master_driver extends uvm_driver #(axi_transaction);
  \`uvm_component_utils(axi_master_driver)
  
  virtual axi_if vif;
  
  function new(string name, uvm_component parent);
    super.new(name, parent);
  endfunction
  
  function void build_phase(uvm_phase phase);
    super.build_phase(phase);
    if (!uvm_config_db#(virtual axi_if)::get(this, "", "vif", vif))
      \`uvm_fatal("NOVIF", "Virtual interface not found")
  endfunction
  
  task run_phase(uvm_phase phase);
    forever begin
      seq_item_port.get_next_item(req);
      drive_transaction(req);
      seq_item_port.item_done();
    end
  endtask
  
  task drive_transaction(axi_transaction trans);
    // Drive AXI write address channel
    vif.awvalid <= 1'b1;
    vif.awaddr <= trans.addr;
    @(posedge vif.aclk);
    wait(vif.awready);
    vif.awvalid <= 1'b0;
    
    // Drive AXI write data channel
    vif.wvalid <= 1'b1;
    vif.wdata <= trans.data;
    @(posedge vif.aclk);
    wait(vif.wready);
    vif.wvalid <= 1'b0;
  endtask
endclass`,
      monitor: `class axi_master_monitor extends uvm_monitor;
  \`uvm_component_utils(axi_master_monitor)
  
  virtual axi_if vif;
  uvm_analysis_port #(axi_transaction) ap;
  
  function new(string name, uvm_component parent);
    super.new(name, parent);
  endfunction
  
  function void build_phase(uvm_phase phase);
    super.build_phase(phase);
    ap = new("ap", this);
    if (!uvm_config_db#(virtual axi_if)::get(this, "", "vif", vif))
      \`uvm_fatal("NOVIF", "Virtual interface not found")
  endfunction
  
  task run_phase(uvm_phase phase);
    forever begin
      axi_transaction trans = axi_transaction::type_id::create("trans");
      sample_transaction(trans);
      ap.write(trans);
    end
  endtask
  
  task sample_transaction(axi_transaction trans);
    @(posedge vif.aclk);
    if (vif.awvalid && vif.awready) begin
      trans.addr = vif.awaddr;
      trans.trans_type = WRITE;
    end
  endtask
endclass`,
      env: `class axi_slave_env extends uvm_env;
  \`uvm_component_utils(axi_slave_env)
  
  axi_master_agent master_agent;
  axi_scoreboard scoreboard;
  
  function new(string name, uvm_component parent);
    super.new(name, parent);
  endfunction
  
  function void build_phase(uvm_phase phase);
    super.build_phase(phase);
    master_agent = axi_master_agent::type_id::create("master_agent", this);
    scoreboard = axi_scoreboard::type_id::create("scoreboard", this);
  endfunction
  
  function void connect_phase(uvm_phase phase);
    super.connect_phase(phase);
    master_agent.monitor.ap.connect(scoreboard.analysis_export);
  endfunction
endclass`,
    };

    return mockCodeMap[type] || `// ${type} code preview\n// Code will be displayed here`;
  };

  const getTypeColor = (type: string) => {
    const colorMap: Record<string, string> = {
      env: "bg-purple-100 text-purple-800",
      agent: "bg-blue-100 text-blue-800",
      driver: "bg-green-100 text-green-800",
      monitor: "bg-yellow-100 text-yellow-800",
      sequencer: "bg-orange-100 text-orange-800",
      scoreboard: "bg-red-100 text-red-800",
      interface: "bg-indigo-100 text-indigo-800",
      sequence: "bg-pink-100 text-pink-800",
      test: "bg-teal-100 text-teal-800",
    };
    return colorMap[type] || "bg-gray-100 text-gray-800";
  };

  const handleDownloadFile = async () => {
    if (!node.filePath) return;

    setIsDownloading(true);
    try {
      await downloadIndividualFile(projectId, node.filePath);
    } catch (error: any) {
      console.error("Failed to download file:", error);
      alert(`Failed to download file: ${error.message || "Unknown error"}`);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span
              className={`px-2.5 py-1 rounded-md text-xs font-medium ${getTypeColor(
                node.type,
              )}`}
            >
              {node.type}
            </span>
            <h3 className="text-sm font-semibold text-gray-900">{node.name}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Close"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
        {node.description && (
          <p className="text-sm text-gray-600 mt-2">{node.description}</p>
        )}
        {node.filePath && (
          <p className="text-xs text-gray-500 mt-1 font-mono">{node.filePath}</p>
        )}
      </div>

      {/* Code Preview */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-900">Code Preview</h4>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-blue-600 hover:text-blue-700"
          >
            {isExpanded ? "Collapse" : "Expand"}
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8 bg-gray-50 rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        ) : (
          <div
            className={`bg-gray-900 rounded-lg overflow-hidden ${
              isExpanded ? "max-h-[600px]" : "max-h-[300px]"
            }`}
          >
            <div className="overflow-auto p-4">
              <pre className="text-xs text-gray-100 font-mono leading-relaxed">
                <code>{code}</code>
              </pre>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center space-x-2 mt-3">
          <button
            onClick={() => {
              navigator.clipboard.writeText(code);
              alert("Code copied to clipboard!");
            }}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <svg
              className="w-4 h-4 mr-1.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            Copy Code
          </button>
          {node.filePath && (
            <>
              <button
                onClick={handleDownloadFile}
                disabled={isDownloading}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDownloading ? (
                  <>
                    <svg
                      className="animate-spin w-4 h-4 mr-1.5"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Downloading...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4 mr-1.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Download File
                  </>
                )}
              </button>
              {onOpenInEditor && (
                <button
                  onClick={() => onOpenInEditor(node, code)}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
                >
                  <svg
                    className="w-4 h-4 mr-1.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Edit in Editor
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComponentDetailsPanel;
