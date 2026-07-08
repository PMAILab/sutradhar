import { Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { NewIntakePage } from "./pages/NewIntakePage";
import { EventPage } from "./pages/EventPage";
import { VendorsPage } from "./pages/VendorsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SuccessPage } from "./pages/SuccessPage";

function App() {
  return (
    <Routes>
      <Route path="/events/:id/success" element={<SuccessPage />} />
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/intake" element={<NewIntakePage />} />
        <Route path="/events/:id" element={<EventPage />} />
        <Route path="/vendors" element={<VendorsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
