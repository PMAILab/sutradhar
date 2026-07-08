import { Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { NewIntakePage } from "./pages/NewIntakePage";
import { EventPage } from "./pages/EventPage";
import { VendorsPage } from "./pages/VendorsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ComingSoonPage } from "./pages/ComingSoonPage";

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/intake" element={<NewIntakePage />} />
        <Route path="/events/:id" element={<EventPage />} />
        <Route path="/vendors" element={<VendorsPage />} />
        <Route path="/settings" element={<ComingSoonPage title="Settings" />} />
      </Route>
    </Routes>
  );
}

export default App;
