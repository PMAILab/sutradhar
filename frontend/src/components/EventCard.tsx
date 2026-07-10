import { Link } from "react-router-dom";
import type { EventSummary } from "../lib/api";

export function EventCard({ event }: { event: EventSummary }) {
  const percent = event.progress.total > 0 ? Math.round((event.progress.confirmed / event.progress.total) * 100) : 0;
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <Link
      to={`/events/${event.id}`}
      className="group bg-surface-container-lowest border border-outline-variant p-8 rounded-xl transition-all hover:shadow-xl hover:-translate-y-1"
    >
      <div className="flex justify-between items-start mb-6">
        <div>
          <h4 className="font-serif text-headline-sm text-on-surface mb-1">
            {event.coupleNames ?? "Untitled wedding"}
          </h4>
          <p className="font-sans text-body-sm text-on-surface-variant">
            {event.weddingDate ?? "Date not set"}
            {event.city ? ` · ${event.city}` : ""}
          </p>
          {typeof event.guestCount === "number" && (
            <p className="font-sans text-label-sm text-on-surface-variant mt-1">{event.guestCount} guests</p>
          )}
        </div>
        <div className="relative w-12 h-12 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90">
            <circle className="text-surface-container" cx="24" cy="24" fill="transparent" r={radius} stroke="currentColor" strokeWidth="4" />
            <circle
              className="text-primary"
              cx="24"
              cy="24"
              fill="transparent"
              r={radius}
              stroke="currentColor"
              strokeWidth="4"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <span className="absolute text-[10px] font-bold text-primary">{percent}%</span>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between py-2 border-b border-outline-variant/30">
          <span className="font-sans text-body-sm text-on-surface-variant">Vendors confirmed</span>
          <span className="font-sans text-label-sm text-secondary">
            {event.vendorSummary.confirmed} / {event.vendorSummary.total}
          </span>
        </div>
        {event.vendorSummary.needsAttention > 0 && (
          <div className="flex items-center justify-between py-2 border-b border-outline-variant/30">
            <span className="font-sans text-body-sm text-on-surface-variant">Need attention</span>
            <span className="font-sans text-label-sm text-tertiary">{event.vendorSummary.needsAttention}</span>
          </div>
        )}
        {event.lastGapCount > 0 && (
          <div className="flex items-center justify-between py-2 border-b border-outline-variant/30">
            <span className="font-sans text-body-sm text-on-surface-variant">Gaps to review</span>
            <span className="font-sans text-label-sm text-tertiary">{event.lastGapCount}</span>
          </div>
        )}
      </div>

      <span className="font-sans text-label-sm text-on-surface-variant uppercase tracking-widest">
        {event.tradition === "unspecified" ? "Tradition not confirmed" : event.tradition.replace(/_/g, " ")}
      </span>
    </Link>
  );
}
