import { useState } from "react";

const HELP_ITEMS = [
  {
    title: "Dashboard",
    body: "Urgent items are ranked: overdue vendor confirmations first, then approaching ceremony dates, then unresolved Completeness Copilot gaps. Not a learned model, just a simple explainable tier ranking across every active wedding you're running.",
  },
  {
    title: "New Intake",
    body: "Paste a client's WhatsApp messages or notes as-is, no cleanup needed. The Intake Parser (Gemini) structures it into a ceremony-by-ceremony plan. Anything ambiguous comes back as a conflict for you to resolve with one tap, instead of the AI silently guessing.",
  },
  {
    title: "Plan tab",
    body: "Each ceremony (Haldi, Mehendi, Sangeet, Wedding, Reception...) has its own task list. The Completeness Copilot panel on the right reads your plan against a religion- and region-tagged ceremony knowledge base and flags what's commonly missing for that tradition, with a plain-language reason attached to each suggestion, not a bare checklist item. For a ceremony or tradition outside that reviewed knowledge base, Gemini suggests a conservative checklist on the fly instead, clearly labeled AI-suggested so you know to double check it. Dismiss one and it never resurfaces for this wedding.",
  },
  {
    title: "Vendors tab",
    body: "Send WhatsApp confirmations, payment reminders, and plan updates from approved Meta templates, one at a time or as a bulk reminder to everyone who hasn't confirmed. A vendor with no reply for 48 hours is escalated to Needs attention automatically instead of being retried silently, and the AI Copilot Recommendation card drafts a follow-up for the most urgent one.",
  },
  {
    title: "Activity tab",
    body: "Every WhatsApp message sent and received across this wedding's vendors, merged into one feed, newest first, so you can see what was actually said without opening each vendor separately.",
  },
  {
    title: "Settings",
    body: "Your profile, WhatsApp automation toggles, and notification preferences. Turning off WhatsApp integration here stops all vendor sends for your account, including bulk reminders.",
  },
];

export function HelpPanel() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-3 px-4 py-2 font-label-lg text-label-lg text-on-surface-variant hover:bg-surface-container transition-colors w-full"
      >
        <span className="material-symbols-outlined">help</span>
        Help
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-gutter" onClick={() => setOpen(false)}>
          <div
            className="bg-surface border border-outline-variant rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="font-serif text-headline-md text-primary">How Sutradhar works</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-on-surface-variant hover:text-primary"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <p className="font-sans text-body-sm text-on-surface-variant leading-relaxed mb-8 pb-6 border-b border-outline-variant">
              Sutradhar takes a messy client brief and turns it into a structured wedding
              plan, then keeps chasing vendors and family on WhatsApp so you're not the only
              one doing it. Two things are AI-driven: reading a brief into a ceremony plan
              (Intake Parser), and checking that plan for what's commonly missing for the
              tradition (Completeness Copilot). Everything else, sending, tracking, and
              escalating vendors, is plain rules you can see and predict.
            </p>

            <div className="space-y-6">
              {HELP_ITEMS.map((item) => (
                <div key={item.title}>
                  <p className="font-sans text-label-lg text-on-surface mb-1">{item.title}</p>
                  <p className="font-sans text-body-sm text-on-surface-variant leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-outline-variant flex items-center justify-between">
              <a
                href="/privacy.html"
                target="_blank"
                rel="noreferrer"
                className="font-sans text-label-sm text-primary underline"
              >
                Privacy policy
              </a>
              <a
                href="mailto:support@sutradhar.ai"
                className="font-sans text-label-sm text-primary underline"
              >
                Contact support
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
