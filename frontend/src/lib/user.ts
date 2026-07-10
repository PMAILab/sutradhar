import type { AuthUser } from "./api";

// A planner's display name: Google sign-in supplies a name; email/password
// signups have none, so fall back to the part of the email before the "@",
// title-cased.
export function plannerDisplayName(user: AuthUser | null | undefined): string {
  if (!user) return "";
  if (user.name && user.name.trim()) return user.name.trim();

  const local = user.email?.split("@")[0] ?? "";
  if (!local) return "";
  return local
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
