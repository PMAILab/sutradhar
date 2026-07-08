import { Fragment, useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  listVendors,
  addVendor,
  getVendorMessages,
  getMessageTemplates,
  sendVendorMessage,
  listEvents,
  type Vendor,
  type VendorMessage,
  type MessageTemplateDef,
  type EventSummary,
} from "../lib/api";
import { VendorStatusPill } from "../components/StatusPill";

type ListState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded"; vendors: Vendor[] };

export function VendorsPage() {
  const [searchParams] = useSearchParams();
  const filterEventId = searchParams.get("eventId") ?? undefined;

  const [listState, setListState] = useState<ListState>({ status: "loading" });
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [templates, setTemplates] = useState<Record<string, MessageTemplateDef>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newVendor, setNewVendor] = useState({ eventId: filterEventId ?? "", name: "", role: "", phoneNumber: "" });
  const [expandedVendorId, setExpandedVendorId] = useState<string | null>(null);
  const [historyByVendor, setHistoryByVendor] = useState<Record<string, VendorMessage[]>>({});
  const [sendPanelVendorId, setSendPanelVendorId] = useState<string | null>(null);

  useEffect(() => {
    loadVendors();
    listEvents()
      .then((res) => setEvents(res.events))
      .catch(() => {
        // Event names are only needed for display and the send form's defaults.
      });
    getMessageTemplates()
      .then((res) => setTemplates(res.templates))
      .catch(() => {
        // Template list is only needed to build the send form, fails silently here,
        // the send form itself will show an error if templates never loaded.
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterEventId]);

  async function loadVendors() {
    setListState({ status: "loading" });
    try {
      const { vendors } = await listVendors(filterEventId);
      setListState({ status: "loaded", vendors });
    } catch (error) {
      setListState({
        status: "error",
        message: error instanceof Error ? error.message : "Could not load vendors right now.",
      });
    }
  }

  async function handleAddVendor() {
    if (!newVendor.eventId || !newVendor.name || !newVendor.role || !newVendor.phoneNumber) return;
    await addVendor(newVendor);
    setNewVendor({ eventId: filterEventId ?? "", name: "", role: "", phoneNumber: "" });
    setShowAddForm(false);
    loadVendors();
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

  function eventLabel(eventId: string): string {
    const event = events.find((e) => e.id === eventId);
    return event?.coupleNames ?? "Unknown wedding";
  }

  const filteredEvent = filterEventId ? events.find((e) => e.id === filterEventId) : undefined;

  return (
    <div className="flex-1 p-margin_mobile md:p-margin_desktop overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="font-serif text-headline-lg text-primary">Vendors</h2>
          <p className="font-sans text-body-sm text-on-surface-variant">
            Confirmations, payment reminders, and plan updates over WhatsApp.
            {filteredEvent && ` Showing ${filteredEvent.coupleNames ?? "this wedding"} only.`}
          </p>
          {filterEventId && (
            <Link to="/vendors" className="font-sans text-label-sm text-primary underline">
              Show all weddings
            </Link>
          )}
        </div>
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="bg-primary text-on-primary px-6 py-3 rounded font-sans text-label-lg hover:opacity-90 transition-opacity"
        >
          Add vendor
        </button>
      </div>

      {showAddForm && (
        <div className="bg-surface-container-low border border-outline-variant rounded-lg p-6 mb-8 flex gap-4 items-end flex-wrap">
          <div className="flex-1 min-w-[180px]">
            <label className="block font-sans text-label-sm text-on-surface-variant uppercase mb-1">Wedding</label>
            <select
              className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded"
              value={newVendor.eventId}
              onChange={(e) => setNewVendor((v) => ({ ...v, eventId: e.target.value }))}
            >
              <option value="">Select a wedding</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.coupleNames ?? "Untitled wedding"}
                </option>
              ))}
            </select>
          </div>
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
        </div>
      )}

      {listState.status === "loading" && (
        <div className="space-y-3">
          <div className="h-16 bg-surface-container-low rounded animate-pulse" />
          <div className="h-16 bg-surface-container-low rounded animate-pulse" />
        </div>
      )}

      {listState.status === "error" && (
        <div className="bg-surface-container-low border border-outline-variant p-6 rounded space-y-3">
          <p className="font-sans text-body-sm text-tertiary">{listState.message}</p>
          <button onClick={loadVendors} className="font-sans text-label-lg text-primary underline">
            Try again
          </button>
        </div>
      )}

      {listState.status === "loaded" && listState.vendors.length === 0 && (
        <div className="bg-surface-container-low border border-outline-variant rounded-lg p-10 text-center">
          <p className="font-sans text-body-md text-on-surface-variant">
            No vendors yet. Add one to start sending confirmations and reminders over WhatsApp.
          </p>
        </div>
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
                {!filterEventId && (
                  <th className="px-gutter py-4 font-sans text-label-sm text-on-surface-variant uppercase tracking-widest">
                    Wedding
                  </th>
                )}
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
                  <tr className="hover:bg-surface-container-lowest transition-colors">
                    <td className="px-gutter py-5 font-sans text-body-md font-medium">{vendor.name}</td>
                    <td className="px-gutter py-5 font-sans text-body-sm text-on-surface-variant">{vendor.role}</td>
                    {!filterEventId && (
                      <td className="px-gutter py-5 font-sans text-body-sm text-on-surface-variant">
                        {eventLabel(vendor.eventId)}
                      </td>
                    )}
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
                      <td colSpan={filterEventId ? 4 : 5} className="p-6">
                        <VendorSendForm
                          vendor={vendor}
                          templates={templates}
                          event={events.find((e) => e.id === vendor.eventId)}
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
                      <td colSpan={filterEventId ? 4 : 5} className="p-6">
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
  event?: EventSummary;
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
      if (label.toLowerCase().includes("couple")) return event?.coupleNames ?? "";
      if (label.toLowerCase().includes("date")) return event?.weddingDate ?? "";
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
