import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getEvent } from "../lib/api";

export function SuccessPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [coupleNames, setCoupleNames] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getEvent(id)
      .then(({ event }) => setCoupleNames(event.coupleNames))
      .catch(() => {
        // Not critical, the message just falls back to a generic line.
      });
  }, [id]);

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-gutter">
      <div className="max-w-xl w-full text-center flex flex-col items-center">
        <div className="mb-10 relative flex items-center justify-center">
          <svg width="100" height="100" viewBox="0 0 120 120" fill="none">
            <circle cx="60" cy="60" r="58" stroke="#f7bd48" strokeWidth="1.5" opacity="0.4" />
            <path
              d="M35 60L52 77L85 44"
              stroke="#7b5800"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="check-draw"
            />
          </svg>
        </div>

        <h1 className="font-serif text-display-lg italic text-on-surface leading-tight mb-4">
          Another wedding, delivered.
        </h1>
        <p className="font-sans text-body-lg text-on-surface-variant max-w-md mx-auto mb-10">
          {coupleNames ? `${coupleNames}'s wedding` : "This wedding"} is marked complete, every ceremony and vendor
          accounted for.
        </p>

        <button
          onClick={() => navigate("/dashboard")}
          className="px-12 py-4 bg-primary text-on-primary rounded-lg font-sans text-label-lg tracking-widest uppercase hover:bg-primary-container transition-all active:scale-95"
        >
          Return to dashboard
        </button>
      </div>
      <style>{`
        .check-draw {
          stroke-dasharray: 100;
          stroke-dashoffset: 100;
          animation: check-draw 0.8s 0.3s cubic-bezier(0.65, 0, 0.45, 1) forwards;
        }
        @keyframes check-draw {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </main>
  );
}
