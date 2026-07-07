import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { to: "/intake", label: "New Intake", icon: "event" },
  { to: "/vendors", label: "Vendors", icon: "groups" },
  { to: "/settings", label: "Settings", icon: "settings" },
];

export function Sidebar() {
  return (
    <aside className="w-[280px] h-screen fixed left-0 top-0 flex flex-col py-base px-gutter bg-surface border-r border-outline-variant z-50">
      <div className="mb-10">
        <h1 className="font-headline-lg text-headline-lg text-primary font-semibold italic">Sutradhar</h1>
        <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">
          Wedding AI Copilot
        </p>
      </div>
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
      <div className="mt-auto space-y-4 pt-6 border-t border-outline-variant">
        <button className="flex items-center gap-3 px-4 py-2 font-label-lg text-label-lg text-on-surface-variant hover:bg-surface-container transition-colors w-full">
          <span className="material-symbols-outlined">logout</span>
          Logout
        </button>
      </div>
    </aside>
  );
}
