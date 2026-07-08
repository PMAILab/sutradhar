import { NavLink } from "react-router-dom";
import { navItems } from "./Sidebar";

export function BottomTabBar() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface border-t border-outline-variant flex items-stretch z-50">
      {navItems.map((item) => (
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
          {item.label === "New Intake" ? "Add" : item.label}
        </NavLink>
      ))}
    </nav>
  );
}
