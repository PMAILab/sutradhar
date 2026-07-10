import { useAuth } from "../context/AuthContext";
import { plannerDisplayName } from "../lib/user";
import { GlobalSearch } from "./GlobalSearch";

// Header shown across every in-app screen, matching the Stitch mockups:
// search on the left, notifications + planner identity on the right.
export function TopBar() {
  const { user } = useAuth();
  const name = plannerDisplayName(user) || "Planner";
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <header className="hidden md:flex items-center justify-between gap-6 h-16 px-margin_desktop border-b border-outline-variant bg-surface/80 backdrop-blur-sm sticky top-0 z-40">
      <GlobalSearch />

      <div className="flex items-center gap-6 shrink-0">
        <button
          type="button"
          aria-label="Notifications"
          className="text-on-surface-variant hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined">notifications</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center font-sans text-label-sm font-semibold">
            {initials || "P"}
          </div>
          <div className="leading-tight">
            <p className="font-sans text-label-lg text-on-surface">{name}</p>
            <p className="font-sans text-label-sm text-on-surface-variant uppercase tracking-widest">Lead Planner</p>
          </div>
        </div>
      </div>
    </header>
  );
}
