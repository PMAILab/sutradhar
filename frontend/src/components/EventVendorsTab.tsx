import { Fragment, useEffect, useState } from "react";
import {
  listVendors,
  addVendor,
  getVendorMessages,
  getMessageTemplates,
  sendVendorMessage,
  sendBulkReminder,
  type Vendor,
  type VendorMessage,
  type MessageTemplateDef,
  type WeddingEvent,
} from "../lib/api";
import { VendorStatusPill } from "./StatusPill";
import { Skeleton } from "./ui/Skeleton";
import { ErrorState } from "./ui/ErrorState";
import { EmptyState } from "./ui/EmptyState";

type ListState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded"; vendors: Vendor[] };

export function EventVendorsTab({
  eventId,
  event,
  venueManagerPhone,
  onViewTask,
}: {
  eventId: string;
  event: WeddingEvent;
  venueManagerPhone: string | null;
  onViewTask: (ceremonyId: string) => void;
}) {
  const [listState, setListState] = useState<ListState>({ status: "loading" });
  const [templates, setTemplates] = useState<Record<string, MessageTemplateDef>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newVendor, setNewVendor] = useState({ name: "", role: "", phoneNumber: "" });
  const [expandedVendorId, setExpandedVendorId] = useState<string | null>(null);
  const [historyByVendor, setHistoryByVendor] = useState<Record<string, VendorMessage[]>>({});
  const [sendPanelVendorId, setSendPanelVendorId] = useState<string | null>(null);
  const [addError, setAddError] = useState("");
  const [bulkState, setBulkState] = useState<"idle" | "sending" | { sent: number; failed: number } | string>("idle");

  useEffect(() => {
    loadVendors();
    getMessageTemplates()
      .then((res) => setTemplates(res.templates))
      .catch(() => {
        // Template list is only needed to build the send form, fails silently here,
        // the send form itself will show an error if templates never loaded.
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function loadVendors() {
    setListState({ status: "loading" });
    try {
      const { vendors } = await listVendors(eventId);
      setListState({ status: "loaded", vendors });
    } catch (error) {
      setListState({
        status: "error",
        message: error instanceof Error ? error.message : "Could not load vendors right now.",
      });
    }
  }

  async function handleAddVendor() {
    if (!newVendor.name || !newVendor.role || !newVendor.phoneNumber) {
      setAddError("Fill in the name, role, and WhatsApp number first.");
      return;
    }
    setAddError("");
    try {
      await addVendor({ eventId, ...newVendor });
      setNewVendor({ name: "", role: "", phoneNumber: "" });
      setShowAddForm(false);
      loadVendors();
    } catch (error) {
      setAddError(error instanceof Error ? error.message : "Could not add that vendor right now.");
    }
  }

  async function handleBulkReminder() {
    setBulkState("sending");
    try {
      const result = await sendBulkReminder(eventId);
      setBulkState(result);
      loadVendors();
    } catch (error) {
      setBulkState(error instanceof Error ? error.message : "Could not send the bulk reminder right now.");
    }
  }

  async function toggleHistory(vendorId: string) {
    if (expandedVendorId === vendorId) {
      setExpandedVendorId(null);
      return;
    }
    setExpandedVendorId(vendorId);
    if (!historyByVendor[vendorId]) {
      const { messages } = await getVendorMessages(vendorId);
      setHistoryByVendor((prev) => ({ ...prev, [vendorId]: messages }));
    }
  }

  const vendors = listState.status === "loaded" ? listState.vendors : [];
  const needsAttentionVendor = vendors.find((v) => v.status === "needs_attention");

  const outstandingTasks = event.ceremonies
    .flatMap((c) => c.tasks.map((t) => ({ ...t, ceremonyId: c.id, ceremonyName: c.name })))
    .filter((t) => t.status !== "confirmed")
    .slice(0, 5);

  const venueQuery = event.venue.address ? `${event.venue.name ?? ""} ${event.venue.address}`.trim() : null;

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
      <div className="flex-1 p-margin_mobile md:p-margin_desktop overflow-y-auto">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
          <div>
            <h3 className="font-serif text-headline-md text-on-surface">Vendor WhatsApp coordination</h3>
            <p className="font-sans text-body-sm text-on-surface-variant">
              Confirmations, payment reminders, and plan updates over WhatsApp.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleBulkReminder}
              disabled={bulkState === "sending" || vendors.length === 0}
              className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded font-sans text-label-lg hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-lg">forward_to_inbox</span>
              {bulkState === "sending" ? "Sending..." : "Send bulk reminder"}
            </button>
            <button
              onClick={() => setShowAddForm((v) => !v)}
              className="border border-outline text-on-surface px-5 py-2.5 rounded font-sans text-label-lg hover:bg-surface-container transition-colors"
            >
              Add vendor
            </button>
          </div>
        </div>

        {typeof bulkState === "object" && (
          <p className="mb-6 font-sans text-body-sm text-secondary">
            Sent to {bulkState.sent} vendor{bulkState.sent === 1 ? "" : "s"}
            {bulkState.failed > 0 ? `, ${bulkState.failed} failed` : ""}.
          </p>
        )}
        {typeof bulkState === "string" && bulkState !== "idle" && bulkState !== "sending" && (
          <p className="mb-6 font-sans text-body-sm text-tertiary">{bulkState}</p>
        )}

        {showAddForm && (
          <div className="bg-surface-container-low border border-outline-variant rounded-lg p-6 mb-8 flex gap-4 items-end flex-wrap">
            <div className="flex-1 min-w-[160px]">
              <label className="block font-sans text-label-sm text-on-surface-variant uppercase mb-1">Name</label>
              <input
                className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded"
                value={newVendor.name}
                onChange={(e) => setNewVendor((v) => ({ ...v, name: e.target.value }))}
              />
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block font-sans text-label-sm text-on-surface-variant uppercase mb-1">Role</label>
              <input
                className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded"
                placeholder="Caterer, photographer..."
                value={newVendor.role}
                onChange={(e) => setNewVendor((v) => ({ ...v, role: e.target.value }))}
              />
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block font-sans text-label-sm text-on-surface-variant uppercase mb-1">
                WhatsApp number
              </label>
              <input
                className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded"
                placeholder="919876543210"
                value={newVendor.phoneNumber}
                onChange={(e) => setNewVendor((v) => ({ ...v, phoneNumber: e.target.value }))}
              />
            </div>
            <button
              onClick={handleAddVendor}
              className="px-6 py-2 bg-primary text-on-primary rounded font-sans text-label-lg"
            >
              Save
            </button>
            {addError && (
              <p className="w-full font-sans text-body-sm text-tertiary flex items-center gap-1">
                <span className="material-symbols-outlined text-lg">error</span>
                {addError}
              </p>
            )}
          </div>
        )}

        {listState.status === "loading" && (
          <div className="space-y-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        )}

        {listState.status === "error" && <ErrorState description={listState.message} onRetry={loadVendors} />}

        {listState.status === "loaded" && listState.vendors.length === 0 && (
          <EmptyState
            icon="groups"
            title="No vendors yet"
            description="Add one to start sending confirmations and reminders over WhatsApp."
          />
        )}

        {listState.status === "loaded" && listState.vendors.length > 0 && (
          <div className="bg-surface border border-outline-variant overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  <th className="px-gutter py-4 font-sans text-label-sm text-on-surface-variant uppercase tracking-widest">
                    Vendor
                  </th>
                  <th className="px-gutter py-4 font-sans text-label-sm text-on-surface-variant uppercase tracking-widest">
                    Role
                  </th>
                  <th className="px-gutter py-4 font-sans text-label-sm text-on-surface-variant uppercase tracking-widest">
                    WhatsApp status
                  </th>
                  <th className="px-gutter py-4 font-sans text-label-sm text-on-surface-variant uppercase tracking-widest text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {listState.vendors.map((vendor) => (
                  <Fragment key={vendor.id}>
                    <tr
                      className={`transition-colors ${
                        vendor.status === "needs_attention"
                          ? "bg-tertiary/5 hover:bg-tertiary/10"
                          : "hover:bg-surface-container-lowest"
                      }`}
                    >
                      <td className="px-gutter py-5 font-sans text-body-md font-medium">{vendor.name}</td>
                      <td className="px-gutter py-5 font-sans text-body-sm text-on-surface-variant">{vendor.role}</td>
                      <td className="px-gutter py-5">
                        <VendorStatusPill status={vendor.status} />
                      </td>
                      <td className="px-gutter py-5 text-right space-x-4">
                        <button
                          onClick={() => setSendPanelVendorId(sendPanelVendorId === vendor.id ? null : vendor.id)}
                          className="font-sans text-label-lg text-primary underline"
                        >
                          {vendor.status === "needs_attention" ? "Urgent reminder" : "Send message"}
                        </button>
                        <button
                          onClick={() => toggleHistory(vendor.id)}
                          className="font-sans text-label-lg text-on-surface-variant underline"
                        >
                          View history
                        </button>
                      </td>
                    </tr>
                    {sendPanelVendorId === vendor.id && (
                      <tr className="bg-surface-container-low/50">
                        <td colSpan={4} className="p-6">
                          <VendorSendForm
                            vendor={vendor}
                            templates={templates}
                            event={event}
                            onSent={() => {
                              setSendPanelVendorId(null);
                              loadVendors();
                            }}
                          />
                        </td>
                      </tr>
                    )}
                    {expandedVendorId === vendor.id && (
                      <tr className="bg-surface-container-low/50">
                        <td colSpan={4} className="p-6">
                          <MessageHistory messages={historyByVendor[vendor.id] ?? []} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Right rail: venue, AI recommendation, upcoming tasks */}
      <aside className="w-full lg:w-[360px] border-t lg:border-t-0 lg:border-l border-outline-variant bg-surface flex flex-col p-gutter gap-6 overflow-y-auto">
        {venueQuery && (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
            <iframe
              title="Venue location"
              className="w-full h-40 border-0"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(venueQuery)}&output=embed`}
              loading="lazy"
            />
            <div className="p-5">
              <p className="font-sans text-label-sm text-on-surface-variant uppercase tracking-widest mb-1">Venue</p>
              <p className="font-serif text-headline-sm text-on-surface">{event.venue.name ?? "Venue"}</p>
              {event.venue.address && (
                <p className="font-sans text-body-sm text-on-surface-variant">{event.venue.address}</p>
              )}
              {typeof event.venue.capacity === "number" && (
                <p className="font-sans text-label-sm text-on-surface-variant mt-1">
                  Capacity {event.venue.capacity}
                  {typeof event.guestCount === "number" ? ` · ${event.guestCount} expected` : ""}
                </p>
              )}
              {venueManagerPhone && (
                <a
                  href={`tel:+${venueManagerPhone}`}
                  className="mt-4 flex items-center justify-center gap-2 border border-outline text-on-surface px-4 py-2 rounded font-sans text-label-sm hover:bg-surface-container transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">call</span>
                  Call venue manager
                </a>
              )}
            </div>
          </div>
        )}

        {needsAttentionVendor && (
          <div className="bg-primary text-on-primary rounded-lg p-5 space-y-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">auto_awesome</span>
              <p className="font-sans text-label-sm uppercase tracking-widest">AI Copilot recommendation</p>
            </div>
            <p className="font-sans text-body-sm leading-relaxed italic">
              {needsAttentionVendor.lastMessage?.deliveryStatus === "failed"
                ? `"The last message to ${needsAttentionVendor.name} failed to send${
                    needsAttentionVendor.lastMessage.errorReason ? `: ${needsAttentionVendor.lastMessage.errorReason}` : ""
                  }. Nothing's gone out yet, worth trying again or reaching them another way."`
                : `"${needsAttentionVendor.name} hasn't responded in over 48 hours. Based on past messages, a direct
              follow-up usually gets a faster response than waiting. I've drafted an urgent follow-up below."`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setSendPanelVendorId(needsAttentionVendor.id)}
                className="flex-1 py-2.5 px-4 bg-on-primary text-primary font-sans text-label-lg rounded hover:opacity-90 transition-all"
              >
                Review draft
              </button>
              <a
                href={`tel:+${needsAttentionVendor.phoneNumber}`}
                aria-label={`Call ${needsAttentionVendor.name}`}
                className="flex items-center justify-center px-4 py-2.5 border border-on-primary/40 rounded hover:bg-on-primary/10 transition-all"
              >
                <span className="material-symbols-outlined">call</span>
              </a>
            </div>
          </div>
        )}

        <div className="bg-surface-container-low border border-outline-variant rounded-lg p-5">
          <p className="font-sans text-label-sm text-on-surface-variant uppercase tracking-widest mb-4">
            Upcoming tasks
          </p>
          {outstandingTasks.length === 0 ? (
            <p className="font-sans text-body-sm text-on-surface-variant">Nothing outstanding right now.</p>
          ) : (
            <ul className="space-y-3">
              {outstandingTasks.map((task) => (
                <li key={task.id}>
                  <button
                    onClick={() => onViewTask(task.ceremonyId)}
                    className="w-full text-left flex items-start gap-2 hover:text-primary transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg mt-0.5">radio_button_unchecked</span>
                    <span>
                      <span className="block font-sans text-body-sm">{task.title}</span>
                      <span className="block font-sans text-label-sm text-on-surface-variant">
                        {task.ceremonyName}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}

function MessageHistory({ messages }: { messages: VendorMessage[] }) {
  if (messages.length === 0) {
    return <p className="font-sans text-body-sm text-on-surface-variant">No messages sent yet.</p>;
  }
  return (
    <div className="space-y-3">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex flex-col max-w-md p-3 rounded-lg shadow-sm ${
            message.direction === "outbound" ? "bg-white" : "bg-primary/10 self-end ml-auto"
          }`}
        >
          <p className="text-body-sm">{message.body}</p>
          {message.errorReason && (
            <p className="text-[12px] text-tertiary mt-1">Could not send: {message.errorReason}</p>
          )}
          <span className="text-[10px] text-on-surface-variant self-end mt-1">
            {new Date(message.timestamp).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

function VendorSendForm({
  vendor,
  templates,
  event,
  onSent,
}: {
  vendor: Vendor;
  templates: Record<string, MessageTemplateDef>;
  event: WeddingEvent;
  onSent: () => void;
}) {
  const templateNames = Object.keys(templates);
  const [templateName, setTemplateName] = useState(templateNames[0] ?? "");
  const [params, setParams] = useState<string[]>([]);
  const [sendState, setSendState] = useState<"idle" | "sending" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!templateName || !templates[templateName]) return;
    setParams(defaultParams(templates[templateName].paramLabels));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateName, templates]);

  function defaultParams(labels: string[]): string[] {
    return labels.map((label) => {
      if (label.toLowerCase().includes("vendor name")) return vendor.name;
      if (label.toLowerCase().includes("couple")) return event.coupleNames ?? "";
      if (label.toLowerCase().includes("date")) return event.weddingDate ?? "";
      return "";
    });
  }

  if (templateNames.length === 0) {
    return (
      <p className="font-sans text-body-sm text-tertiary">
        Message templates could not be loaded. Try again in a moment.
      </p>
    );
  }

  const activeTemplate = templates[templateName];

  async function handleSend() {
    setSendState("sending");
    try {
      await sendVendorMessage(vendor.id, templateName, params);
      onSent();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not send that message right now.");
      setSendState("error");
    }
  }

  return (
    <div className="space-y-4 max-w-xl">
      <div>
        <label className="block font-sans text-label-sm text-on-surface-variant uppercase mb-1">Template</label>
        <select
          className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
        >
          {templateNames.map((name) => (
            <option key={name} value={name}>
              {name.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      {activeTemplate?.paramLabels.map((label, index) => (
        <div key={label}>
          <label className="block font-sans text-label-sm text-on-surface-variant uppercase mb-1">{label}</label>
          <input
            className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded"
            value={params[index] ?? ""}
            onChange={(e) => {
              const next = [...params];
              next[index] = e.target.value;
              setParams(next);
            }}
          />
        </div>
      ))}

      {sendState === "error" && <p className="font-sans text-body-sm text-tertiary">{errorMessage}</p>}

      <button
        onClick={handleSend}
        disabled={sendState === "sending"}
        className="px-6 py-3 bg-primary text-on-primary rounded font-sans text-label-lg disabled:opacity-60"
      >
        {sendState === "sending" ? "Sending..." : "Send via WhatsApp"}
      </button>
    </div>
  );
}
