import { useState } from "react";

export function SettingsPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [vendorFollowUps, setVendorFollowUps] = useState(true);
  const [dailySummary, setDailySummary] = useState(true);

  return (
    <div className="flex-1 p-margin_mobile md:p-margin_desktop overflow-y-auto max-w-[900px]">
      <header className="mb-10">
        <h2 className="font-serif text-headline-lg text-primary mb-2">Settings</h2>
        <p className="font-sans text-body-md text-on-surface-variant">
          Your profile and WhatsApp automation preferences.
        </p>
      </header>

      <section className="bg-surface-container-lowest border border-outline-variant p-8 rounded-lg mb-gutter">
        <h3 className="font-serif text-headline-sm text-on-surface mb-6">Profile</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="font-sans text-label-sm text-on-surface-variant uppercase">Planner name</label>
            <input
              className="w-full bg-transparent border-b border-outline-variant py-2 font-sans text-body-md focus:outline-none focus:border-primary transition-colors"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-2">
            <label className="font-sans text-label-sm text-on-surface-variant uppercase">Email address</label>
            <input
              className="w-full bg-transparent border-b border-outline-variant py-2 font-sans text-body-md focus:outline-none focus:border-primary transition-colors"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
        </div>
      </section>

      <section className="bg-surface-container-high border border-outline-variant p-6 rounded-lg mb-gutter">
        <h3 className="font-serif text-headline-sm text-on-surface mb-6">WhatsApp automation</h3>
        <div className="space-y-6">
          <ToggleRow
            label="WhatsApp integration"
            description="Send confirmations, reminders, and updates through WhatsApp"
            checked={whatsappEnabled}
            onChange={setWhatsappEnabled}
          />
          <ToggleRow
            label="Vendor follow-ups"
            description="Automatic escalation when a vendor goes unresponsive"
            checked={vendorFollowUps}
            onChange={setVendorFollowUps}
          />
        </div>
      </section>

      <section className="bg-surface-container-lowest border border-outline-variant p-6 rounded-lg mb-gutter">
        <h3 className="font-serif text-headline-sm text-on-surface mb-6">Notifications</h3>
        <label className="flex items-center gap-4 cursor-pointer">
          <input
            type="checkbox"
            className="w-5 h-5 border-outline-variant rounded accent-primary"
            checked={dailySummary}
            onChange={(e) => setDailySummary(e.target.checked)}
          />
          <span className="font-sans text-body-md">Daily summary of urgent items</span>
        </label>
      </section>

      <button className="flex items-center gap-2 font-sans text-label-lg text-tertiary hover:underline">
        <span className="material-symbols-outlined">logout</span>
        Log out
      </button>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="font-sans text-label-lg text-on-surface">{label}</p>
        <p className="font-sans text-body-sm text-on-surface-variant">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer shrink-0">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className="w-11 h-6 bg-surface-variant rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:border-outline after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
      </label>
    </div>
  );
}
