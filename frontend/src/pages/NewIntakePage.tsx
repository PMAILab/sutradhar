import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { parseIntake } from "../lib/api";

const LOADING_STEPS = [
  "Reading your notes...",
  "Working out which ceremonies apply...",
  "Structuring the plan...",
];

type ViewState = "idle" | "loading" | "error";

export function NewIntakePage() {
  const [rawText, setRawText] = useState("");
  const [viewState, setViewState] = useState<ViewState>("idle");
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  async function handleSubmit() {
    if (rawText.trim().length < 10) {
      setErrorMessage("Paste a bit more detail so there's something real to structure.");
      setViewState("error");
      return;
    }

    setViewState("loading");
    setLoadingStepIndex(0);
    const stepTimer = setInterval(() => {
      setLoadingStepIndex((prev) => Math.min(prev + 1, LOADING_STEPS.length - 1));
    }, 900);

    try {
      const { event, fallback } = await parseIntake(rawText);
      clearInterval(stepTimer);
      navigate(`/events/${event.id}`, { state: { introFallback: fallback } });
    } catch (error) {
      clearInterval(stepTimer);
      setErrorMessage(
        error instanceof Error ? error.message : "Could not read that brief right now, try again in a moment.",
      );
      setViewState("error");
    }
  }

  if (viewState === "loading") {
    return (
      <div className="flex-1 flex items-center justify-center p-gutter">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="relative inline-block">
            <div className="w-24 h-24 rounded-full border-t-2 border-primary animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl text-primary">auto_awesome</span>
            </div>
          </div>
          <h2 className="font-serif text-headline-md text-primary">{LOADING_STEPS[loadingStepIndex]}</h2>
          <p className="font-sans text-body-sm text-on-surface-variant">
            This usually takes a few seconds, occasionally up to a minute.
          </p>
        </div>
      </div>
    );
  }

  return (
    <section className="flex-1 max-w-[900px] mx-auto w-full px-gutter py-12">
      <div className="mb-10 text-center">
        <h2 className="font-serif text-display-lg text-primary mb-4">Start a New Weaving</h2>
        <p className="font-sans text-body-lg text-on-surface-variant max-w-2xl mx-auto">
          Paste the client's WhatsApp messages, notes, or a rough brief here. Sutradhar will structure it into a
          ceremony by ceremony plan.
        </p>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-sm">
        <textarea
          className="w-full h-[360px] bg-transparent border border-outline-variant focus:border-primary focus:ring-0 rounded-lg p-6 font-sans text-body-md text-on-surface placeholder:text-on-surface-variant/40 resize-none transition-all outline-none"
          placeholder="Paste the client's WhatsApp messages, notes, or a rough brief here."
          value={rawText}
          onChange={(event) => setRawText(event.target.value)}
        />

        {viewState === "error" && (
          <div className="mt-4 flex items-start gap-2 text-tertiary">
            <span className="material-symbols-outlined text-lg">error</span>
            <p className="font-sans text-body-sm">{errorMessage}</p>
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={handleSubmit}
            className="bg-primary hover:bg-primary-container text-on-primary px-10 py-4 rounded-full font-sans text-label-lg flex items-center gap-3 transition-all active:scale-95 shadow-md"
          >
            <span>Structure this plan</span>
            <span className="material-symbols-outlined">east</span>
          </button>
        </div>
      </div>
    </section>
  );
}
