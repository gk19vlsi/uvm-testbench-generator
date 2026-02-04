import { Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./components/Dashboard";
import GenerationInterface from "./components/GenerationInterface";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/project/:projectId" element={<GenerationInterface />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
