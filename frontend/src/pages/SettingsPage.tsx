import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { plannerDisplayName } from "../lib/user";
import { getProfile, updateProfile as updateProfileApi } from "../lib/api";

const LANGUAGES = ["English (UK)", "English (US)", "Hindi", "Tamil", "Bengali"];
const TIMEZONES = ["IST (UTC+5:30)", "GST (UTC+4)", "GMT (UTC+0)", "EST (UTC-5)", "PST (UTC-8)"];

export function SettingsPage() {
  const { signOut, user, updateLocalUser, isMock } = useAuth();
  const navigate = useNavigate();
  const email = user?.email ?? "";

  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState(() => plannerDisplayName(user));
  const [phone, setPhone] = useState("");
  const [language, setLanguage] = useState(LANGUAGES[0]);
  const [timezone, setTimezone] = useState(TIMEZONES[0]);
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [vendorFollowUps, setVendorFollowUps] = useState(true);
  const [dailySummary, setDailySummary] = useState(true);
  const [browserPush, setBrowserPush] = useState(true);
  const [aiInsights, setAiInsights] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    getProfile()
      .then((profile) => {
        setName(profile.name || plannerDisplayName(user));
        setPhone(profile.phone ?? "");
        setLanguage(profile.language);
        setTimezone(profile.timezone);
        setWhatsappEnabled(profile.whatsappEnabled);
        setVendorFollowUps(profile.vendorFollowUps);
        setDailySummary(profile.dailySummary);
        setBrowserPush(profile.browserPush);
        setAiInsights(profile.aiInsights);
      })
      .catch(() => {
        // Fields keep their sensible defaults if this fails; Save still works.
      })
      .finally(() => setLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaveState("idle");
    setSaveError("");
    try {
      const updated = await updateProfileApi({
        name,
        phone,
        language,
        timezone,
        whatsappEnabled,
        vendorFollowUps,
        dailySummary,
        browserPush,
        aiInsights,
      });
      updateLocalUser({ name: updated.name ?? undefined });
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2500);
    } catch (error) {
      setSaveState("error");
      setSaveError(error instanceof Error ? error.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex-1 p-margin_mobile md:p-margin_desktop overflow-y-auto max-w-[1100px]">
      <header className="mb-10">
        <h2 className="font-serif text-headline-lg text-primary mb-2">Account settings</h2>
        <p className="font-sans text-body-md text-on-surface-variant">
          Manage your profile, communication preferences, and automation tools.
        </p>
        {isMock && (
          <p className="font-sans text-body-sm text-on-surface-variant mt-2">
            You're signed in with a local demo session, everything below is saved on this
            device only.
          </p>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-gutter mb-gutter items-start">
        <section className="bg-surface-container-lowest border border-outline-variant p-8 rounded-lg">
          <h3 className="font-serif text-headline-sm text-on-surface mb-6">Profile</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Field label="Planner name">
              <input
                className="w-full bg-transparent border-b border-outline-variant py-2 font-sans text-body-md focus:outline-none focus:border-primary transition-colors"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </Field>
            <Field label="Email address">
              <input
                className="w-full bg-transparent border-b border-outline-variant py-2 font-sans text-body-md text-on-surface-variant focus:outline-none cursor-not-allowed"
                type="email"
                value={email}
                readOnly
                placeholder="you@example.com"
              />
            </Field>
            <Field label="Phone number">
              <input
                className="w-full bg-transparent border-b border-outline-variant py-2 font-sans text-body-md focus:outline-none focus:border-primary transition-colors"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
              />
            </Field>
            <Field label="Language preference">
              <select
                className="w-full bg-transparent border-b border-outline-variant py-2 font-sans text-body-md focus:outline-none focus:border-primary transition-colors"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                {LANGUAGES.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </Field>
            <Field label="Timezone">
              <select
                className="w-full bg-transparent border-b border-outline-variant py-2 font-sans text-body-md focus:outline-none focus:border-primary transition-colors"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              >
                {TIMEZONES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        <div className="space-y-gutter">
          <section className="bg-surface-container-high border border-outline-variant p-6 rounded-lg">
            <h3 className="font-serif text-headline-sm text-on-surface mb-6">Automations</h3>
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

          <section className="bg-surface-container-lowest border border-outline-variant p-6 rounded-lg">
            <h3 className="font-serif text-headline-sm text-on-surface mb-6">Notifications</h3>
            <div className="space-y-4">
              <label className="flex items-center gap-4 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-5 h-5 border-outline-variant rounded accent-primary"
                  checked={browserPush}
                  onChange={(e) => setBrowserPush(e.target.checked)}
                />
                <span className="font-sans text-body-md">Browser push notifications</span>
              </label>
              <label className="flex items-center gap-4 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-5 h-5 border-outline-variant rounded accent-primary"
                  checked={dailySummary}
                  onChange={(e) => setDailySummary(e.target.checked)}
                />
                <span className="font-sans text-body-md">Daily event summaries</span>
              </label>
              <label className="flex items-center gap-4 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-5 h-5 border-outline-variant rounded accent-primary"
                  checked={aiInsights}
                  onChange={(e) => setAiInsights(e.target.checked)}
                />
                <span className="font-sans text-body-md">AI insights & tips</span>
              </label>
            </div>
          </section>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-10">
        <button
          onClick={handleSave}
          disabled={saving || !loaded}
          className="bg-primary text-on-primary px-8 py-3 rounded-full font-sans text-label-lg hover:bg-primary-container transition-all active:scale-95 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
        {saveState === "saved" && (
          <span className="flex items-center gap-1 font-sans text-label-lg text-secondary">
            <span className="material-symbols-outlined text-lg">check_circle</span>
            Saved
          </span>
        )}
        {saveState === "error" && (
          <span className="flex items-center gap-1 font-sans text-body-sm text-tertiary">
            <span className="material-symbols-outlined text-lg">error</span>
            {saveError || "Could not save"}
          </span>
        )}
      </div>

      <section className="border border-tertiary/40 rounded-lg p-6">
        <p className="font-sans text-label-sm text-tertiary uppercase tracking-widest mb-4">Danger zone</p>
        <button
          onClick={async () => {
            await signOut();
            navigate("/login");
          }}
          className="flex items-center gap-2 font-sans text-label-lg text-tertiary hover:underline"
        >
          <span className="material-symbols-outlined">logout</span>
          Sign out of account
        </button>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="font-sans text-label-sm text-on-surface-variant uppercase">{label}</label>
      {children}
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
