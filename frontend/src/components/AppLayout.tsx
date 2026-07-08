import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { BottomTabBar } from "./BottomTabBar";

export function AppLayout() {
  return (
    <div className="bg-background text-on-surface font-body-md min-h-screen">
      <Sidebar />
      <main className="md:ml-[280px] min-h-screen relative flex flex-col pb-16 md:pb-0">
        <Outlet />
      </main>
      <BottomTabBar />
    </div>
  );
}
