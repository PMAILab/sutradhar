import { Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { NewIntakePage } from "./pages/NewIntakePage";
import { PlanPage } from "./pages/PlanPage";
import { ComingSoonPage } from "./pages/ComingSoonPage";

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/intake" replace />} />
        <Route path="/intake" element={<NewIntakePage />} />
        <Route path="/plan" element={<PlanPage />} />
        <Route path="/dashboard" element={<ComingSoonPage title="Dashboard" />} />
        <Route path="/vendors" element={<ComingSoonPage title="Vendors" />} />
        <Route path="/settings" element={<ComingSoonPage title="Settings" />} />
      </Route>
    </Routes>
  );
}

export default App;
