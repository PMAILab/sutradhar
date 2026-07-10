import type { ReactNode } from "react";

export function EmptyState({
  icon = "inbox",
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center bg-surface-container-low border border-outline-variant rounded-lg">
      <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-3">{icon}</span>
      <h3 className="mb-2 font-serif text-headline-sm text-primary">{title}</h3>
      {description && <p className="mb-6 max-w-sm font-sans text-body-sm text-on-surface-variant">{description}</p>}
      {action}
    </div>
  );
}
