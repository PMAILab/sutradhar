import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { HelpPanel } from "./HelpPanel";

export const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { to: "/events", label: "Events", icon: "event" },
  { to: "/settings", label: "Settings", icon: "settings" },
];

export function Sidebar() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut();
    navigate("/login");
  }

  return (
    <aside className="hidden md:flex w-[280px] h-screen fixed left-0 top-0 flex-col py-base px-gutter bg-surface border-r border-outline-variant z-50">
      <div className="mb-10">
        <h1 className="font-headline-lg text-headline-lg text-primary font-semibold italic">Sutradhar</h1>
        <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">
          Wedding AI Copilot
        </p>
      </div>
      <Link
        to="/intake"
        className="flex items-center justify-center gap-2 mb-8 px-4 py-3 rounded-lg bg-primary text-on-primary font-sans text-label-lg hover:bg-primary-container transition-all active:scale-95 shadow-sm"
      >
        <span className="material-symbols-outlined text-lg">add</span>
        New Event
      </Link>
      <nav className="flex-1 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 font-label-lg text-label-lg transition-colors duration-200 ${
                isActive
                  ? "text-primary font-bold border-r-2 border-primary bg-surface-container-high"
                  : "text-on-surface-variant hover:bg-surface-container"
              }`
            }
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto space-y-1 pt-6 border-t border-outline-variant">
        <HelpPanel />
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2 font-label-lg text-label-lg text-on-surface-variant hover:bg-surface-container transition-colors w-full"
        >
          <span className="material-symbols-outlined">logout</span>
          Logout
        </button>
      </div>
    </aside>
  );
}
