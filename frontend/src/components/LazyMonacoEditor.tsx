import React, { Suspense, lazy } from 'react';

/**
 * Lazy-loaded Monaco Editor component for code splitting
 * This reduces initial bundle size by loading Monaco Editor only when needed
 */

// Lazy load Monaco Editor
const MonacoEditor = lazy(() => import('@monaco-editor/react'));

interface LazyMonacoEditorProps {
  value: string;
  language: string;
  onChange?: (value: string | undefined) => void;
  onSave?: () => void;
  readOnly?: boolean;
  height?: string;
}

/**
 * Loading fallback component
 */
const EditorLoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center h-full bg-gray-900">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
      <p className="text-gray-400">Loading editor...</p>
    </div>
  </div>
);

/**
 * Lazy Monaco Editor Component
 */
export const LazyMonacoEditor: React.FC<LazyMonacoEditorProps> = ({
  value,
  language,
  onChange,
  onSave,
  readOnly = false,
  height = '600px',
}) => {
  const handleEditorDidMount = (editor: any, monaco: any) => {
    // Add keyboard shortcut for save (Ctrl+S / Cmd+S)
    if (onSave) {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        onSave();
      });
    }

    // Configure editor options
    editor.updateOptions({
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      fontSize: 14,
      lineNumbers: 'on',
      renderWhitespace: 'selection',
      automaticLayout: true,
    });
  };

  return (
    <Suspense fallback={<EditorLoadingFallback />}>
      <MonacoEditor
        height={height}
        language={language}
        value={value}
        onChange={onChange}
        onMount={handleEditorDidMount}
        theme="vs-dark"
        options={{
          readOnly,
          selectOnLineNumbers: true,
          roundedSelection: false,
          cursorStyle: 'line',
          automaticLayout: true,
        }}
      />
    </Suspense>
  );
};

export default LazyMonacoEditor;
