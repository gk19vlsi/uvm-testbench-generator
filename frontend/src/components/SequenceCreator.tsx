/**
 * Sequence Creator Component
 * Provides a dialog for creating new UVM sequences with templates
 */

import { useState } from "react";

interface SequenceCreatorProps {
  onSequenceCreated: (filePath: string, content: string) => void;
  onClose: () => void;
}

type SequenceType = "base" | "directed" | "error" | "random" | "stress";

const SequenceCreator: React.FC<SequenceCreatorProps> = ({
  onSequenceCreated,
  onClose,
}) => {
  const [sequenceName, setSequenceName] = useState("");
  const [sequenceType, setSequenceType] = useState<SequenceType>("directed");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sequenceTypes: Array<{
    type: SequenceType;
    label: string;
    description: string;
  }> = [
    {
      type: "base",
      label: "Base Sequence",
      description: "Abstract base class with common functionality",
    },
    {
      type: "directed",
      label: "Directed Sequence",
      description: "Target specific scenarios from specification",
    },
    {
      type: "error",
      label: "Error Sequence",
      description: "Inject protocol violations and error conditions",
    },
    {
      type: "random",
      label: "Random Sequence",
      description: "Constrained-random stimulus generation",
    },
    {
      type: "stress",
      label: "Stress Sequence",
      description: "Back-to-back transactions and corner cases",
    },
  ];

  const getSequenceTemplate = (
    name: string,
    type: SequenceType,
    desc: string,
  ): string => {
    const className = `${name}_seq`;
    const baseClass = type === "base" ? "uvm_sequence" : `base_seq`;

    const templates: Record<SequenceType, string> = {
      base: `/**
 * ${name} Base Sequence
 * ${desc || "Base sequence class with common functionality"}
 */

class ${className} extends uvm_sequence #(transaction_item);
  \`uvm_object_utils(${className})

  // Sequence properties
  rand int num_transactions;
  
  // Constraints
  constraint num_trans_c {
    num_transactions inside {[1:10]};
  }

  function new(string name = "${className}");
    super.new(name);
  endfunction

  virtual task body();
    \`uvm_info(get_type_name(), "Starting sequence", UVM_MEDIUM)
    
    // Implement sequence logic here
    repeat(num_transactions) begin
      transaction_item trans;
      \`uvm_do(trans)
    end
    
    \`uvm_info(get_type_name(), "Sequence completed", UVM_MEDIUM)
  endtask

endclass`,

      directed: `/**
 * ${name} Directed Sequence
 * ${desc || "Directed sequence targeting specific scenario"}
 */

class ${className} extends ${baseClass};
  \`uvm_object_utils(${className})

  function new(string name = "${className}");
    super.new(name);
  endfunction

  virtual task body();
    transaction_item trans;
    
    \`uvm_info(get_type_name(), "Starting directed sequence: ${name}", UVM_MEDIUM)
    
    // Directed scenario implementation
    \`uvm_do_with(trans, {
      // Add specific constraints for this scenario
      // Example: trans.addr == 32'h1000;
      //          trans.data == 32'hDEADBEEF;
    })
    
    \`uvm_info(get_type_name(), "Directed sequence completed", UVM_MEDIUM)
  endtask

endclass`,

      error: `/**
 * ${name} Error Sequence
 * ${desc || "Error injection sequence for protocol violations"}
 */

class ${className} extends ${baseClass};
  \`uvm_object_utils(${className})

  function new(string name = "${className}");
    super.new(name);
  endfunction

  virtual task body();
    transaction_item trans;
    
    \`uvm_info(get_type_name(), "Starting error injection sequence: ${name}", UVM_MEDIUM)
    
    // Error injection implementation
    \`uvm_do_with(trans, {
      // Add constraints to create error conditions
      // Example: trans.parity_error == 1'b1;
      //          trans.invalid_opcode == 1'b1;
    })
    
    \`uvm_info(get_type_name(), "Error injection completed", UVM_MEDIUM)
  endtask

endclass`,

      random: `/**
 * ${name} Random Sequence
 * ${desc || "Constrained-random sequence for coverage"}
 */

class ${className} extends ${baseClass};
  \`uvm_object_utils(${className})

  rand int num_transactions;
  
  constraint num_trans_c {
    num_transactions inside {[10:50]};
  }

  function new(string name = "${className}");
    super.new(name);
  endfunction

  virtual task body();
    \`uvm_info(get_type_name(), 
              $sformatf("Starting random sequence with %0d transactions", num_transactions), 
              UVM_MEDIUM)
    
    repeat(num_transactions) begin
      transaction_item trans;
      
      // Random transaction with constraints
      \`uvm_do_with(trans, {
        // Add randomization constraints
        // Example: trans.addr inside {[0:1023]};
        //          trans.burst_length inside {[1:16]};
      })
    end
    
    \`uvm_info(get_type_name(), "Random sequence completed", UVM_MEDIUM)
  endtask

endclass`,

      stress: `/**
 * ${name} Stress Sequence
 * ${desc || "Stress sequence with back-to-back transactions"}
 */

class ${className} extends ${baseClass};
  \`uvm_object_utils(${className})

  rand int num_transactions;
  
  constraint num_trans_c {
    num_transactions inside {[100:500]};
  }

  function new(string name = "${className}");
    super.new(name);
  endfunction

  virtual task body();
    \`uvm_info(get_type_name(), 
              $sformatf("Starting stress sequence with %0d back-to-back transactions", num_transactions), 
              UVM_MEDIUM)
    
    // Back-to-back transactions with no delays
    repeat(num_transactions) begin
      transaction_item trans;
      
      \`uvm_do_with(trans, {
        // Stress conditions
        // Example: trans.burst_length == 16; // Maximum burst
        //          trans.priority == HIGH;
      })
      
      // No delay between transactions for maximum stress
    end
    
    \`uvm_info(get_type_name(), "Stress sequence completed", UVM_MEDIUM)
  endtask

endclass`,
    };

    return templates[type];
  };

  const handleCreate = () => {
    // Validate inputs
    if (!sequenceName.trim()) {
      setError("Sequence name is required");
      return;
    }

    // Validate sequence name format (alphanumeric and underscores only)
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(sequenceName)) {
      setError(
        "Sequence name must start with a letter and contain only letters, numbers, and underscores",
      );
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      // Generate sequence code from template
      const sequenceCode = getSequenceTemplate(
        sequenceName,
        sequenceType,
        description,
      );

      // Generate file path
      const filePath = `sequences/${sequenceName}_seq.sv`;

      // Call the callback with the new sequence
      onSequenceCreated(filePath, sequenceCode);

      // Close the dialog
      onClose();
    } catch (err: any) {
      console.error("Failed to create sequence:", err);
      setError(err.message || "Failed to create sequence");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Create New Sequence
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="space-y-4">
            {/* Sequence Name */}
            <div>
              <label
                htmlFor="sequenceName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Sequence Name *
              </label>
              <input
                type="text"
                id="sequenceName"
                value={sequenceName}
                onChange={(e) => setSequenceName(e.target.value)}
                placeholder="e.g., write_burst, read_single"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Will be saved as: sequences/{sequenceName}_seq.sv
              </p>
            </div>

            {/* Sequence Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sequence Type *
              </label>
              <div className="space-y-2">
                {sequenceTypes.map((type) => (
                  <label
                    key={type.type}
                    className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                      sequenceType === type.type
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    <input
                      type="radio"
                      name="sequenceType"
                      value={type.type}
                      checked={sequenceType === type.type}
                      onChange={(e) =>
                        setSequenceType(e.target.value as SequenceType)
                      }
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {type.label}
                      </div>
                      <div className="text-xs text-gray-600 mt-0.5">
                        {type.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Description (Optional)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of what this sequence does..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <svg
                    className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={onClose}
              disabled={isCreating}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={isCreating || !sequenceName.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline"
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
                  Creating...
                </>
              ) : (
                "Create Sequence"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SequenceCreator;
