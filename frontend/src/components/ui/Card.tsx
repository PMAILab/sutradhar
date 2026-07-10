import type { HTMLAttributes } from "react";

/** The one card surface reused across Dashboard, Event Detail, and vendor
 *  rows — soft ivory surface, hairline border, small radius, matching the
 *  Stitch design brief's "reuse one card component" build note. */
export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`bg-surface-container-lowest border border-outline-variant rounded-lg ${className}`}
      {...props}
    />
  );
}
