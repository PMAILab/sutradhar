const STATUS_STYLES: Record<string, { bg: string; dot: string; text: string; label: string }> = {
  confirmed: { bg: "bg-secondary-fixed/20", dot: "bg-secondary", text: "text-on-secondary-container", label: "Confirmed" },
  pending: { bg: "bg-error-container/40", dot: "bg-error", text: "text-on-error-container", label: "Pending" },
  needs_review: { bg: "bg-tertiary-fixed/40", dot: "bg-tertiary", text: "text-on-tertiary-fixed-variant", label: "Needs review" },
};

export function StatusPill({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.pending;
  return (
    <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-full ${style.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      <span className={`font-sans text-label-sm ${style.text} uppercase`}>{style.label}</span>
    </div>
  );
}
