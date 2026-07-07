import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  return (
    <div className="bg-background text-on-surface font-body-md min-h-screen">
      <Sidebar />
      <main className="ml-[280px] min-h-screen relative flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}
