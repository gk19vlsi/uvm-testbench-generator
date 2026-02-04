/**
 * Inline Code Editor Component
 * Provides syntax-highlighted code editing using Monaco Editor
 * with SystemVerilog language support
 */

import { useRef, useState, useEffect } from "react";
import Editor, { Monaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";

interface InlineCodeEditorProps {
  code: string;
  language: "systemverilog" | "verilog";
  filePath: string;
  readOnly?: boolean;
  onSave?: (updatedCode: string) => Promise<void>;
  onClose?: () => void;
}

const InlineCodeEditor: React.FC<InlineCodeEditorProps> = ({
  code,
  language,
  filePath,
  readOnly = false,
  onSave,
  onClose,
}) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [currentCode, setCurrentCode] = useState(code);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [syntaxErrors, setSyntaxErrors] = useState<string[]>([]);

  useEffect(() => {
    setCurrentCode(code);
    setHasChanges(false);
  }, [code]);

  const handleEditorDidMount = (
    editor: editor.IStandaloneCodeEditor,
    monaco: Monaco,
  ) => {
    editorRef.current = editor;

    // Register SystemVerilog language if not already registered
    if (!monaco.languages.getLanguages().some((lang: any) => lang.id === "systemverilog")) {
      registerSystemVerilogLanguage(monaco);
    }

    // Configure editor options
    editor.updateOptions({
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      fontSize: 13,
      lineNumbers: "on",
      renderWhitespace: "selection",
      tabSize: 2,
      insertSpaces: true,
      wordWrap: "on",
      automaticLayout: true,
    });
  };

  const registerSystemVerilogLanguage = (monaco: Monaco) => {
    // Register SystemVerilog language
    monaco.languages.register({ id: "systemverilog" });

    // Define SystemVerilog syntax highlighting
    monaco.languages.setMonarchTokensProvider("systemverilog", {
      defaultToken: "",
      tokenPostfix: ".sv",

      keywords: [
        "module",
        "endmodule",
        "class",
        "endclass",
        "function",
        "endfunction",
        "task",
        "endtask",
        "begin",
        "end",
        "if",
        "else",
        "case",
        "endcase",
        "for",
        "while",
        "forever",
        "repeat",
        "return",
        "break",
        "continue",
        "input",
        "output",
        "inout",
        "logic",
        "bit",
        "byte",
        "int",
        "integer",
        "reg",
        "wire",
        "parameter",
        "localparam",
        "typedef",
        "enum",
        "struct",
        "union",
        "interface",
        "endinterface",
        "modport",
        "clocking",
        "endclocking",
        "property",
        "endproperty",
        "sequence",
        "endsequence",
        "program",
        "endprogram",
        "package",
        "endpackage",
        "import",
        "export",
        "virtual",
        "extends",
        "implements",
        "super",
        "this",
        "new",
        "null",
        "void",
        "static",
        "protected",
        "local",
        "const",
        "rand",
        "randc",
        "constraint",
        "covergroup",
        "endgroup",
        "coverpoint",
        "cross",
        "bins",
        "illegal_bins",
        "ignore_bins",
        "with",
        "matches",
        "inside",
        "dist",
        "assert",
        "assume",
        "cover",
        "expect",
        "wait",
        "fork",
        "join",
        "join_any",
        "join_none",
        "disable",
        "assign",
        "deassign",
        "force",
        "release",
        "initial",
        "always",
        "always_comb",
        "always_ff",
        "always_latch",
        "final",
        "posedge",
        "negedge",
        "or",
        "and",
        "not",
      ],

      uvmKeywords: [
        "uvm_component",
        "uvm_object",
        "uvm_driver",
        "uvm_monitor",
        "uvm_agent",
        "uvm_env",
        "uvm_test",
        "uvm_sequence",
        "uvm_sequence_item",
        "uvm_sequencer",
        "uvm_scoreboard",
        "uvm_subscriber",
        "uvm_analysis_port",
        "uvm_analysis_export",
        "uvm_phase",
        "uvm_config_db",
        "uvm_factory",
        "uvm_component_utils",
        "uvm_object_utils",
        "uvm_field_int",
        "uvm_field_object",
        "uvm_field_string",
        "uvm_info",
        "uvm_warning",
        "uvm_error",
        "uvm_fatal",
      ],

      operators: [
        "=",
        ">",
        "<",
        "!",
        "~",
        "?",
        ":",
        "==",
        "<=",
        ">=",
        "!=",
        "&&",
        "||",
        "++",
        "--",
        "+",
        "-",
        "*",
        "/",
        "&",
        "|",
        "^",
        "%",
        "<<",
        ">>",
        ">>>",
        "<<<",
        "+=",
        "-=",
        "*=",
        "/=",
        "&=",
        "|=",
        "^=",
        "%=",
        "<<=",
        ">>=",
        ">>>=",
        "<<<=",
      ],

      symbols: /[=><!~?:&|+\-*\/\^%]+/,
      escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

      tokenizer: {
        root: [
          // UVM macros
          [/`uvm_[a-zA-Z_]\w*/, "keyword.uvm"],

          // Compiler directives
          [/`[a-zA-Z_]\w*/, "keyword.directive"],

          // Identifiers and keywords
          [
            /[a-zA-Z_]\w*/,
            {
              cases: {
                "@uvmKeywords": "keyword.uvm",
                "@keywords": "keyword",
                "@default": "identifier",
              },
            },
          ],

          // Whitespace
          { include: "@whitespace" },

          // Delimiters and operators
          [/[{}()\[\]]/, "@brackets"],
          [/[<>](?!@symbols)/, "@brackets"],
          [
            /@symbols/,
            {
              cases: {
                "@operators": "operator",
                "@default": "",
              },
            },
          ],

          // Numbers
          [/\d*\.\d+([eE][\-+]?\d+)?/, "number.float"],
          [/0[xX][0-9a-fA-F]+/, "number.hex"],
          [/0[bB][01]+/, "number.binary"],
          [/\d+/, "number"],

          // Strings
          [/"([^"\\]|\\.)*$/, "string.invalid"], // non-terminated string
          [/"/, { token: "string.quote", bracket: "@open", next: "@string" }],
        ],

        string: [
          [/[^\\"]+/, "string"],
          [/@escapes/, "string.escape"],
          [/\\./, "string.escape.invalid"],
          [/"/, { token: "string.quote", bracket: "@close", next: "@pop" }],
        ],

        whitespace: [
          [/[ \t\r\n]+/, "white"],
          [/\/\*/, "comment", "@comment"],
          [/\/\/.*$/, "comment"],
        ],

        comment: [
          [/[^\/*]+/, "comment"],
          [/\/\*/, "comment", "@push"],
          ["\\*/", "comment", "@pop"],
          [/[\/*]/, "comment"],
        ],
      },
    });

    // Define theme for SystemVerilog
    monaco.editor.defineTheme("systemverilog-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "keyword", foreground: "569CD6", fontStyle: "bold" },
        { token: "keyword.uvm", foreground: "C586C0", fontStyle: "bold" },
        { token: "keyword.directive", foreground: "C586C0" },
        { token: "comment", foreground: "6A9955", fontStyle: "italic" },
        { token: "string", foreground: "CE9178" },
        { token: "number", foreground: "B5CEA8" },
        { token: "operator", foreground: "D4D4D4" },
      ],
      colors: {
        "editor.background": "#1E1E1E",
        "editor.foreground": "#D4D4D4",
        "editorLineNumber.foreground": "#858585",
        "editorCursor.foreground": "#AEAFAD",
      },
    });
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setCurrentCode(value);
      setHasChanges(value !== code);
      setSaveError(null);
    }
  };

  const handleSave = async () => {
    if (!onSave || !hasChanges) return;

    setIsSaving(true);
    setSaveError(null);
    setSyntaxErrors([]);

    try {
      await onSave(currentCode);
      setHasChanges(false);
    } catch (error: any) {
      console.error("Failed to save file:", error);
      setSaveError(error.message || "Failed to save file");

      // Extract syntax errors if available
      if (error.syntaxErrors && Array.isArray(error.syntaxErrors)) {
        setSyntaxErrors(error.syntaxErrors.map((e: any) => e.message || String(e)));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevert = () => {
    setCurrentCode(code);
    setHasChanges(false);
    setSaveError(null);
    setSyntaxErrors([]);
  };

  const getFileExtension = () => {
    return filePath.split(".").pop() || "";
  };

  const getEditorLanguage = () => {
    // Map language to Monaco editor language
    if (language === "systemverilog" || getFileExtension() === "sv") {
      return "systemverilog";
    }
    return "verilog"; // Fallback to verilog (will use systemverilog highlighting)
  };

  return (
    <div className="flex flex-col h-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <svg
              className="w-5 h-5 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
              />
            </svg>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">{filePath}</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {readOnly ? "Read-only" : "Editable"} • {language.toUpperCase()}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {hasChanges && !readOnly && (
              <span className="text-xs text-orange-600 font-medium">Unsaved changes</span>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Close editor"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language={getEditorLanguage()}
          value={currentCode}
          theme="systemverilog-dark"
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          options={{
            readOnly: readOnly,
          }}
          loading={
            <div className="flex items-center justify-center h-full bg-gray-900">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          }
        />
      </div>

      {/* Error Display */}
      {(saveError || syntaxErrors.length > 0) && (
        <div className="border-t border-gray-200 bg-red-50 px-4 py-3">
          {saveError && (
            <div className="flex items-start space-x-2 mb-2">
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
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Save Error</p>
                <p className="text-sm text-red-700 mt-1">{saveError}</p>
              </div>
            </div>
          )}
          {syntaxErrors.length > 0 && (
            <div className="mt-2">
              <p className="text-sm font-medium text-red-800 mb-1">Syntax Errors:</p>
              <ul className="list-disc list-inside space-y-1">
                {syntaxErrors.map((error, index) => (
                  <li key={index} className="text-sm text-red-700">
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Footer Actions */}
      {!readOnly && onSave && (
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                  hasChanges && !isSaving
                    ? "text-white bg-blue-600 hover:bg-blue-700"
                    : "text-gray-400 bg-gray-200 cursor-not-allowed"
                }`}
              >
                {isSaving ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                    Saving...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                      />
                    </svg>
                    Save Changes
                  </>
                )}
              </button>
              <button
                onClick={handleRevert}
                disabled={!hasChanges || isSaving}
                className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                  hasChanges && !isSaving
                    ? "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                    : "text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed"
                }`}
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                  />
                </svg>
                Revert
              </button>
            </div>
            <div className="text-xs text-gray-500">
              {currentCode.split("\n").length} lines • {currentCode.length} characters
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InlineCodeEditor;
