import { NavLink } from "react-router-dom";
import { navItems } from "./Sidebar";

// Mirrors the sidebar's nav items plus a dedicated "Add" tab in the middle
// for the same "+ New Event" action the desktop sidebar surfaces as a CTA.
const MOBILE_TABS = [
  navItems[0],
  navItems[1],
  { to: "/intake", label: "Add", icon: "add_circle" },
  navItems[2],
];

export function BottomTabBar() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface border-t border-outline-variant flex items-stretch z-50">
      {MOBILE_TABS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-1 font-sans text-label-sm ${
              isActive ? "text-primary" : "text-on-surface-variant"
            }`
          }
        >
          <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
