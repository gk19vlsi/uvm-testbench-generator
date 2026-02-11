import { Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./components/Dashboard";
import GenerationInterface from "./components/GenerationInterface";
import VisualizationDemo from "./pages/VisualizationDemo";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/project/:projectId" element={<GenerationInterface />} />
      <Route path="/visualization-demo" element={<VisualizationDemo />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
