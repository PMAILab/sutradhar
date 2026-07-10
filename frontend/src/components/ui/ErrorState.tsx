export function ErrorState({
  title = "Could not load that",
  description = "That didn't come through, but everything's still right where you left it. Mind trying again?",
  actionLabel = "Try again",
  onRetry,
}: {
  title?: string;
  description?: string;
  actionLabel?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center bg-surface-container-low border border-outline-variant rounded-lg">
      <span className="material-symbols-outlined text-4xl text-tertiary mb-3">error</span>
      <h3 className="mb-2 font-serif text-headline-sm text-primary">{title}</h3>
      <p className="mb-6 max-w-sm font-sans text-body-sm text-on-surface-variant">{description}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="border border-outline text-on-surface px-6 py-2.5 rounded font-sans text-label-lg hover:bg-surface-container transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
