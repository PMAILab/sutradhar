/** Loading placeholder block. Compose these to match a card's real shape. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-surface-container-low ${className}`} />;
}
