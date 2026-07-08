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

const VENDOR_STATUS_STYLES: Record<string, { bg: string; dot: string; text: string; label: string }> = {
  not_contacted: { bg: "bg-surface-container-high", dot: "bg-outline", text: "text-on-surface-variant", label: "Not contacted" },
  sent: { bg: "bg-surface-container-high", dot: "bg-outline", text: "text-on-surface-variant", label: "Sent" },
  confirmed: { bg: "bg-secondary-fixed/20", dot: "bg-secondary", text: "text-on-secondary-container", label: "Confirmed" },
  declined: { bg: "bg-tertiary-container/20", dot: "bg-tertiary", text: "text-tertiary", label: "Declined" },
  needs_review: { bg: "bg-tertiary-container/20", dot: "bg-tertiary", text: "text-tertiary", label: "Needs review" },
  needs_attention: { bg: "bg-tertiary-container/20", dot: "bg-tertiary", text: "text-tertiary", label: "Needs your attention" },
};

export function VendorStatusPill({ status }: { status: string }) {
  const style = VENDOR_STATUS_STYLES[status] ?? VENDOR_STATUS_STYLES.not_contacted;
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${style.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      <span className={`font-sans text-label-sm ${style.text} uppercase`}>{style.label}</span>
    </div>
  );
}
