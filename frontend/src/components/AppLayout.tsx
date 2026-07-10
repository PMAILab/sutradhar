import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { BottomTabBar } from "./BottomTabBar";
import { TopBar } from "./TopBar";

export function AppLayout() {
  return (
    <div className="bg-background text-on-surface font-body-md min-h-screen">
      <Sidebar />
      <div className="md:ml-[280px] min-h-screen flex flex-col">
        <TopBar />
        <main className="relative flex flex-col flex-1 pb-16 md:pb-0">
          <Outlet />
        </main>
      </div>
      <BottomTabBar />
    </div>
  );
}
