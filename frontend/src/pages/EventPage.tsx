import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams, useLocation, Link } from "react-router-dom";
import {
  checkGaps,
  trackAnalyticsEvent,
  getEvent,
  deleteEvent,
  addCeremony,
  deleteCeremony,
  addTaskToCeremony,
  updateTaskStatus,
  dismissGapApi,
  markEventSuccessful,
  resolveConflict,
  updateEventDetails,
  type Gap,
  type WeddingEvent,
  type MarkSuccessfulWarning,
} from "../lib/api";
import { StatusPill } from "../components/StatusPill";
import { EventVendorsTab } from "../components/EventVendorsTab";
import { EventActivityTab } from "../components/EventActivityTab";
import { Skeleton } from "../components/ui/Skeleton";
import { ErrorState } from "../components/ui/ErrorState";

type GapsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded"; gaps: Gap[]; note?: string };

type EventState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded"; event: WeddingEvent; venueManagerPhone: string | null };

type EventTab = "plan" | "vendors" | "activity";
const TABS: { id: EventTab; label: string }[] = [
  { id: "plan", label: "Plan" },
  { id: "vendors", label: "Vendors" },
  { id: "activity", label: "Activity" },
];

export function EventPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [eventState, setEventState] = useState<EventState>({ status: "loading" });
  const [activeCeremonyId, setActiveCeremonyId] = useState<string | null>(null);
  const [gapsState, setGapsState] = useState<GapsState>({ status: "loading" });
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newCeremonyName, setNewCeremonyName] = useState("");
  const [successWarning, setSuccessWarning] = useState<MarkSuccessfulWarning | null>(null);
  const [actionError, setActionError] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);
  const [detailsForm, setDetailsForm] = useState({
    weddingDate: "",
    city: "",
    guestCount: "",
    venueName: "",
    venueAddress: "",
    venueCapacity: "",
  });
  const [savingDetails, setSavingDetails] = useState(false);
  // Only true right after New Intake's navigate({ state }) — a plain page
  // load/refresh never carries router state, so this naturally clears
  // itself without needing to be written back anywhere.
  const [showFallbackNotice, setShowFallbackNotice] = useState(
    Boolean((location.state as { introFallback?: boolean } | null)?.introFallback),
  );

  const activeTab: EventTab = (searchParams.get("tab") as EventTab) ?? "plan";
  function setActiveTab(tab: EventTab) {
    setSearchParams(tab === "plan" ? {} : { tab });
  }

  async function guard(fn: () => Promise<void>) {
    try {
      setActionError("");
      await fn();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "That action didn't go through, try again.");
    }
  }

  useEffect(() => {
    if (id) loadEvent(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (eventState.status === "loaded") loadGaps(eventState.event.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventState.status === "loaded" ? eventState.event.id : null, eventState.status === "loaded" ? eventState.event.dismissedGapIds.length : 0]);

  async function loadEvent(eventId: string) {
    setEventState({ status: "loading" });
    try {
      const { event, venueManagerPhone } = await getEvent(eventId);
      setEventState({ status: "loaded", event, venueManagerPhone });
      setActiveCeremonyId((prev) => prev ?? event.ceremonies[0]?.id ?? null);
    } catch (error) {
      setEventState({
        status: "error",
        message: error instanceof Error ? error.message : "Could not load this wedding right now.",
      });
    }
  }

  async function loadGaps(eventId: string) {
    setGapsState({ status: "loading" });
    try {
      const result = await checkGaps(eventId);
      setGapsState({ status: "loaded", gaps: result.gaps, note: result.note });
    } catch (error) {
      setGapsState({
        status: "error",
        message: error instanceof Error ? error.message : "Could not check for gaps right now.",
      });
    }
  }

  if (eventState.status === "loading") {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Skeleton className="h-20 w-64" />
      </div>
    );
  }

  if (eventState.status === "error") {
    return (
      <div className="flex-1 flex items-center justify-center p-gutter">
        <div className="max-w-md w-full">
          <ErrorState
            description={eventState.message}
            actionLabel="Back to weddings"
            onRetry={() => navigate("/events")}
          />
        </div>
      </div>
    );
  }

  const { event, venueManagerPhone } = eventState;
  const activeCeremony = event.ceremonies.find((c) => c.id === activeCeremonyId) ?? event.ceremonies[0];

  const daysUntilWedding = event.weddingDate
    ? Math.ceil((new Date(event.weddingDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  // Plan score: share of all tasks across ceremonies that are confirmed.
  const taskTotals = event.ceremonies.reduce(
    (acc, c) => {
      acc.total += c.tasks.length;
      acc.confirmed += c.tasks.filter((t) => t.status === "confirmed").length;
      return acc;
    },
    { confirmed: 0, total: 0 },
  );
  const planScore = taskTotals.total > 0 ? Math.round((taskTotals.confirmed / taskTotals.total) * 100) : 0;

  async function handleAddCeremony() {
    if (newCeremonyName.trim().length === 0) return;
    const name = newCeremonyName.trim();
    await guard(async () => {
      const { event: updated } = await addCeremony(event.id, name);
      setEventState({ status: "loaded", event: updated, venueManagerPhone });
      setActiveCeremonyId(updated.ceremonies[updated.ceremonies.length - 1]?.id ?? null);
      setNewCeremonyName("");
    });
  }

  async function handleDeleteCeremony(ceremonyId: string) {
    if (!window.confirm("Delete this ceremony and all its tasks?")) return;
    await guard(async () => {
      const { event: updated } = await deleteCeremony(event.id, ceremonyId);
      setEventState({ status: "loaded", event: updated, venueManagerPhone });
      setActiveCeremonyId((prev) => (prev === ceremonyId ? (updated.ceremonies[0]?.id ?? null) : prev));
    });
  }

  async function handleAddTask() {
    if (!activeCeremony || newTaskTitle.trim().length === 0) return;
    const ceremonyId = activeCeremony.id;
    await guard(async () => {
      const { event: updated } = await addTaskToCeremony(event.id, ceremonyId, newTaskTitle.trim());
      setEventState({ status: "loaded", event: updated, venueManagerPhone });
      setNewTaskTitle("");
    });
  }

  async function handleToggleTaskStatus(ceremonyId: string, taskId: string, currentStatus: string) {
    const nextStatus = currentStatus === "confirmed" ? "pending" : "confirmed";
    await guard(async () => {
      const { event: updated } = await updateTaskStatus(event.id, taskId, ceremonyId, nextStatus as "pending" | "confirmed");
      setEventState({ status: "loaded", event: updated, venueManagerPhone });
    });
  }

  async function handleAddGapToPlan(gap: Gap) {
    await guard(async () => {
      await addTaskToCeremony(event.id, gap.ceremonyId, gap.label);
      const { event: updated } = await dismissGapApi(event.id, gap.id);
      setEventState({ status: "loaded", event: updated, venueManagerPhone });
      trackAnalyticsEvent("gap_confirmed", { gapId: gap.id, ceremonyName: gap.ceremonyName });
    });
  }

  async function handleDismissGap(gap: Gap) {
    await guard(async () => {
      const { event: updated } = await dismissGapApi(event.id, gap.id);
      setEventState({ status: "loaded", event: updated, venueManagerPhone });
      trackAnalyticsEvent("gap_dismissed", { gapId: gap.id, ceremonyName: gap.ceremonyName });
    });
  }

  async function handleMarkSuccessful() {
    await guard(async () => {
      const result = await markEventSuccessful(event.id, true);
      if ("warning" in result) {
        setSuccessWarning(result);
        return;
      }
      navigate(`/events/${event.id}/success`);
    });
  }

  async function handleConfirmAnyway() {
    setSuccessWarning(null);
    await guard(async () => {
      const result = await markEventSuccessful(event.id, true, true);
      if (!("warning" in result)) {
        navigate(`/events/${event.id}/success`);
      }
    });
  }

  async function handleDelete() {
    setDeleting(true);
    await guard(async () => {
      await deleteEvent(event.id);
      navigate("/events");
    });
    setDeleting(false);
  }

  async function handleResolveConflict(conflictId: string, resolvedValue: string) {
    await guard(async () => {
      const { event: updated } = await resolveConflict(event.id, conflictId, resolvedValue);
      setEventState({ status: "loaded", event: updated, venueManagerPhone });
    });
  }

  function openEditDetails() {
    setDetailsForm({
      weddingDate: event.weddingDate ?? "",
      city: event.city ?? "",
      guestCount: typeof event.guestCount === "number" ? String(event.guestCount) : "",
      venueName: event.venue.name ?? "",
      venueAddress: event.venue.address ?? "",
      venueCapacity: typeof event.venue.capacity === "number" ? String(event.venue.capacity) : "",
    });
    setEditingDetails(true);
  }

  async function handleSaveDetails() {
    setSavingDetails(true);
    await guard(async () => {
      const { event: updated } = await updateEventDetails(event.id, {
        weddingDate: detailsForm.weddingDate.trim() || null,
        city: detailsForm.city.trim() || null,
        guestCount: detailsForm.guestCount.trim() ? Number(detailsForm.guestCount) : null,
        venue: {
          name: detailsForm.venueName.trim() || null,
          address: detailsForm.venueAddress.trim() || null,
          capacity: detailsForm.venueCapacity.trim() ? Number(detailsForm.venueCapacity) : null,
        },
      });
      setEventState({ status: "loaded", event: updated, venueManagerPhone });
      setEditingDetails(false);
    });
    setSavingDetails(false);
  }

  function handleViewTask(ceremonyId: string) {
    setActiveCeremonyId(ceremonyId);
    setActiveTab("plan");
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-margin_mobile md:p-margin_desktop pb-0">
        <Link to="/events" className="font-sans text-label-sm text-on-surface-variant uppercase tracking-widest hover:text-primary">
          Events
        </Link>
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mt-2 mb-6">
          <div>
            <h2 className="font-serif text-headline-lg text-primary">{event.coupleNames ?? "Untitled wedding"}</h2>
            <div className="flex flex-wrap items-center gap-3 mt-1">
              <p className="font-sans text-body-sm text-on-surface-variant">
                {event.weddingDate ?? "Date not set"}
                {event.city ? ` · ${event.city}` : ""}
                {typeof event.guestCount === "number" ? ` · ${event.guestCount} guests` : ""}
              </p>
              <button
                onClick={openEditDetails}
                className="font-sans text-label-sm text-primary hover:underline"
              >
                Edit details
              </button>
              {daysUntilWedding !== null && daysUntilWedding >= 0 && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary font-sans text-label-sm uppercase tracking-widest">
                  {daysUntilWedding === 0 ? "Today" : `${daysUntilWedding} days to go`}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {event.successful ? (
              <span className="font-sans text-label-lg text-secondary">Marked successfully completed</span>
            ) : (
              <button
                onClick={handleMarkSuccessful}
                className="flex items-center gap-2 border border-primary text-primary px-6 py-2.5 rounded font-sans text-label-lg hover:bg-primary/5 transition-all"
              >
                <span className="material-symbols-outlined">check_circle</span>
                Mark as successfully completed
              </button>
            )}
            <button
              onClick={() => setConfirmingDelete(true)}
              aria-label="Delete this wedding"
              className="flex items-center justify-center w-10 h-10 border border-outline-variant text-on-surface-variant rounded hover:border-tertiary hover:text-tertiary transition-all"
            >
              <span className="material-symbols-outlined">delete</span>
            </button>
          </div>
        </div>

        {showFallbackNotice && (
          <div className="mb-8 flex items-start gap-3 bg-primary/5 border border-primary/30 rounded-lg p-5">
            <span className="material-symbols-outlined text-primary">info</span>
            <div className="flex-1">
              <p className="font-sans text-body-md text-on-surface">
                AI structuring wasn't available when this brief was pasted in, so it's saved as one task under
                "Review this brief" instead of split into ceremonies. Add ceremonies and tasks manually below, or
                start a fresh intake with the same brief to try structuring again.
              </p>
            </div>
            <button
              onClick={() => setShowFallbackNotice(false)}
              aria-label="Dismiss"
              className="text-on-surface-variant hover:text-primary"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        )}

        {editingDetails && (
          <div className="mb-8 bg-surface-container-low border border-outline-variant rounded-lg p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1">
                <span className="font-sans text-label-sm text-on-surface-variant uppercase tracking-widest">Wedding date</span>
                <input
                  type="date"
                  value={detailsForm.weddingDate}
                  onChange={(e) => setDetailsForm((f) => ({ ...f, weddingDate: e.target.value }))}
                  className="px-3 py-2 bg-surface border border-outline-variant rounded font-sans text-body-md"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-sans text-label-sm text-on-surface-variant uppercase tracking-widest">City</span>
                <input
                  type="text"
                  value={detailsForm.city}
                  onChange={(e) => setDetailsForm((f) => ({ ...f, city: e.target.value }))}
                  className="px-3 py-2 bg-surface border border-outline-variant rounded font-sans text-body-md"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-sans text-label-sm text-on-surface-variant uppercase tracking-widest">Guest count</span>
                <input
                  type="number"
                  min="0"
                  value={detailsForm.guestCount}
                  onChange={(e) => setDetailsForm((f) => ({ ...f, guestCount: e.target.value }))}
                  className="px-3 py-2 bg-surface border border-outline-variant rounded font-sans text-body-md"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-sans text-label-sm text-on-surface-variant uppercase tracking-widest">Venue name</span>
                <input
                  type="text"
                  value={detailsForm.venueName}
                  onChange={(e) => setDetailsForm((f) => ({ ...f, venueName: e.target.value }))}
                  className="px-3 py-2 bg-surface border border-outline-variant rounded font-sans text-body-md"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-sans text-label-sm text-on-surface-variant uppercase tracking-widest">Venue address</span>
                <input
                  type="text"
                  value={detailsForm.venueAddress}
                  onChange={(e) => setDetailsForm((f) => ({ ...f, venueAddress: e.target.value }))}
                  className="px-3 py-2 bg-surface border border-outline-variant rounded font-sans text-body-md"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-sans text-label-sm text-on-surface-variant uppercase tracking-widest">Venue capacity</span>
                <input
                  type="number"
                  min="0"
                  value={detailsForm.venueCapacity}
                  onChange={(e) => setDetailsForm((f) => ({ ...f, venueCapacity: e.target.value }))}
                  className="px-3 py-2 bg-surface border border-outline-variant rounded font-sans text-body-md"
                />
              </label>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSaveDetails}
                disabled={savingDetails}
                className="px-6 py-2.5 bg-primary text-on-primary rounded font-sans text-label-lg hover:opacity-90 disabled:opacity-60"
              >
                {savingDetails ? "Saving..." : "Save details"}
              </button>
              <button
                onClick={() => setEditingDetails(false)}
                disabled={savingDetails}
                className="px-6 py-2.5 border border-outline rounded font-sans text-label-lg text-on-surface hover:bg-surface-container"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {confirmingDelete && (
          <div className="mb-8 bg-surface-container-low border border-tertiary rounded-lg p-6 space-y-4">
            <p className="font-sans text-body-md text-on-surface">
              Delete {event.coupleNames ?? "this wedding"} for good? Every ceremony, task, vendor, and message on it
              goes with it, this can't be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-6 py-2.5 bg-tertiary text-on-primary rounded font-sans text-label-lg hover:opacity-90 disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Delete wedding"}
              </button>
              <button
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
                className="px-6 py-2.5 border border-outline rounded font-sans text-label-lg text-on-surface hover:bg-surface-container"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {actionError && (
          <div className="mb-6 flex items-center gap-2 bg-tertiary/5 border border-tertiary/40 rounded-lg p-4">
            <span className="material-symbols-outlined text-tertiary">error</span>
            <p className="font-sans text-body-sm text-tertiary">{actionError}</p>
          </div>
        )}

        {successWarning && (
          <div className="mb-8 bg-surface-container-low border border-tertiary rounded-lg p-6 space-y-4">
            <p className="font-sans text-body-md text-on-surface">{successWarning.message}</p>
            {successWarning.problemVendors.length > 0 && (
              <ul className="font-sans text-body-sm text-on-surface-variant list-disc pl-5">
                {successWarning.problemVendors.map((v) => (
                  <li key={v.id}>
                    {v.name} ({v.role}), status: {v.status.replace(/_/g, " ")}
                  </li>
                ))}
              </ul>
            )}
            {successWarning.unresolvedConflicts.length > 0 && (
              <ul className="font-sans text-body-sm text-on-surface-variant list-disc pl-5">
                {successWarning.unresolvedConflicts.map((c) => (
                  <li key={c.id}>{c.description}</li>
                ))}
              </ul>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleConfirmAnyway}
                className="px-6 py-2.5 bg-primary text-on-primary rounded font-sans text-label-lg hover:opacity-90"
              >
                Mark successful anyway
              </button>
              <button
                onClick={() => setSuccessWarning(null)}
                className="px-6 py-2.5 border border-outline rounded font-sans text-label-lg text-on-surface hover:bg-surface-container"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {event.conflicts.some((c) => !c.resolved) && (
          <div className="mb-8 bg-surface-container-low border border-tertiary rounded-lg p-6 space-y-4">
            <p className="font-sans text-label-lg text-tertiary uppercase tracking-widest">
              Needs your confirmation
            </p>
            {event.conflicts
              .filter((c) => !c.resolved)
              .map((conflict) => (
                <div key={conflict.id} className="space-y-2">
                  <p className="font-sans text-body-md text-on-surface">{conflict.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {conflict.options.map((option) => (
                      <button
                        key={option}
                        onClick={() => handleResolveConflict(conflict.id, option)}
                        className="px-4 py-2 border border-outline rounded font-sans text-label-sm text-on-surface hover:bg-surface-container-high transition-colors"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Event tabs */}
        <div className="flex items-end gap-8 border-b border-outline-variant">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-4 font-serif text-headline-sm whitespace-nowrap border-b-2 transition-all ${
                tab.id === activeTab
                  ? "text-primary border-primary font-semibold"
                  : "text-on-surface-variant border-transparent hover:text-on-surface"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "plan" && (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          <div className="flex-1 p-margin_mobile md:p-margin_desktop overflow-y-auto">
            {/* Plan score */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="font-sans text-label-sm text-on-surface-variant uppercase tracking-widest">Plan score</span>
                <span className="font-sans text-label-lg text-primary font-semibold">{planScore}%</span>
              </div>
              <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${planScore}%` }} />
              </div>
              <p className="font-sans text-label-sm text-on-surface-variant mt-1">
                {taskTotals.confirmed} of {taskTotals.total} tasks confirmed
              </p>
            </div>

            {/* Ceremony tabs */}
            <div className="flex items-end gap-8 mb-3 border-b border-outline-variant overflow-x-auto">
              {event.ceremonies.map((ceremony) => (
                <div
                  key={ceremony.id}
                  className={`flex items-center gap-1 pb-4 border-b-2 ${
                    ceremony.id === activeCeremony?.id ? "border-primary" : "border-transparent"
                  }`}
                >
                  <button
                    onClick={() => setActiveCeremonyId(ceremony.id)}
                    className={`font-serif text-headline-sm whitespace-nowrap transition-all ${
                      ceremony.id === activeCeremony?.id
                        ? "text-primary font-semibold"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    {ceremony.name}
                  </button>
                  <button
                    onClick={() => handleDeleteCeremony(ceremony.id)}
                    title="Delete ceremony"
                    aria-label={`Delete ${ceremony.name}`}
                    className="text-on-surface-variant hover:text-tertiary text-label-sm px-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mb-10">
              <input
                className="w-48 px-3 py-2 bg-transparent border border-outline-variant focus:border-primary focus:ring-0 outline-none font-sans text-body-sm rounded-lg"
                placeholder="New ceremony name"
                value={newCeremonyName}
                onChange={(event) => setNewCeremonyName(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && handleAddCeremony()}
              />
              <button
                onClick={handleAddCeremony}
                className="px-4 py-2 border border-outline font-sans text-label-sm text-on-surface hover:bg-surface-container transition-all rounded-lg"
              >
                Add ceremony
              </button>
            </div>

            {activeCeremony && (
              <section className="space-y-gutter">
                <h3 className="font-serif text-headline-md text-on-surface">{activeCeremony.name}</h3>
                {activeCeremony.notes && (
                  <p className="font-sans text-body-sm text-on-surface-variant italic">{activeCeremony.notes}</p>
                )}

                {activeCeremony.tasks.length === 0 ? (
                  <div className="bg-surface-container-low border border-outline-variant rounded-lg p-8 text-center">
                    <p className="font-sans text-body-md text-on-surface-variant">
                      No tasks yet for {activeCeremony.name}. Add one below, or let the Copilot suggest what's usually
                      needed.
                    </p>
                  </div>
                ) : (
                  <div className="bg-surface border border-outline-variant overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-surface-container-low border-b border-outline-variant">
                          <th className="px-gutter py-4 font-sans text-label-sm text-on-surface-variant uppercase tracking-widest">
                            Task
                          </th>
                          <th className="px-gutter py-4 font-sans text-label-sm text-on-surface-variant uppercase tracking-widest">
                            Status
                          </th>
                          <th className="px-gutter py-4 font-sans text-label-sm text-on-surface-variant uppercase tracking-widest">
                            Vendor
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant">
                        {activeCeremony.tasks.map((task) => (
                          <tr key={task.id} className="hover:bg-surface-container-lowest transition-colors">
                            <td className="px-gutter py-6 font-sans text-body-md font-medium">{task.title}</td>
                            <td className="px-gutter py-6">
                              <button onClick={() => handleToggleTaskStatus(activeCeremony.id, task.id, task.status)}>
                                <StatusPill status={task.status} />
                              </button>
                            </td>
                            <td className="px-gutter py-6 font-sans text-body-sm">
                              {task.vendor ?? <span className="italic text-on-surface-variant">Not assigned</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="flex gap-3">
                  <input
                    className="flex-1 px-4 py-3 bg-transparent border border-outline-variant focus:border-primary focus:ring-0 outline-none font-sans text-body-md rounded-lg"
                    placeholder="Add a task to this ceremony"
                    value={newTaskTitle}
                    onChange={(event) => setNewTaskTitle(event.target.value)}
                    onKeyDown={(event) => event.key === "Enter" && handleAddTask()}
                  />
                  <button
                    onClick={handleAddTask}
                    className="px-6 py-3 bg-primary text-on-primary font-sans text-label-lg rounded-lg hover:bg-primary-container transition-colors"
                  >
                    Add
                  </button>
                </div>
              </section>
            )}
          </div>

          {/* Copilot side panel */}
          <aside className="w-full md:w-[400px] border-t md:border-t-0 md:border-l border-outline-variant bg-surface flex flex-col p-gutter overflow-y-auto">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-primary-container rounded-full">
                <span className="material-symbols-outlined text-on-primary-container">auto_awesome</span>
              </div>
              <div>
                <h4 className="font-serif text-headline-sm">A few things worth checking</h4>
                <p className="font-sans text-label-sm text-on-surface-variant">Completeness Copilot</p>
              </div>
            </div>

            {/* Completeness by ceremony */}
            {event.ceremonies.length > 0 && (
              <div className="mb-8 bg-surface-container-low border border-outline-variant rounded-lg p-5">
                <p className="font-sans text-label-sm text-on-surface-variant uppercase tracking-widest mb-4">
                  Completeness by ceremony
                </p>
                <div className="flex items-end gap-2 h-24">
                  {event.ceremonies.map((c) => {
                    const total = c.tasks.length;
                    const confirmed = c.tasks.filter((t) => t.status === "confirmed").length;
                    const pct = total > 0 ? Math.round((confirmed / total) * 100) : 0;
                    return (
                      <div key={c.id} className="flex-1 flex flex-col items-center gap-2" title={`${c.name}: ${pct}%`}>
                        <div className="w-full h-20 bg-surface-container rounded-t flex items-end">
                          <div
                            className="w-full bg-secondary rounded-t transition-all"
                            style={{ height: `${Math.max(pct, 4)}%` }}
                          />
                        </div>
                        <span className="font-sans text-[10px] text-on-surface-variant truncate w-full text-center">
                          {c.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {gapsState.status === "loading" && (
              <div className="space-y-4">
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
                <p className="font-sans text-body-sm text-on-surface-variant text-center pt-2">Checking for gaps...</p>
              </div>
            )}

            {gapsState.status === "error" && (
              <ErrorState description={gapsState.message} onRetry={() => loadGaps(event.id)} />
            )}

            {gapsState.status === "loaded" && gapsState.gaps.length === 0 && (
              <div className="bg-surface-container-low border border-outline-variant p-5">
                <p className="font-sans text-body-sm text-on-surface-variant">
                  {gapsState.note ?? "Nothing flagged right now, the plan looks complete for what's been added so far."}
                </p>
              </div>
            )}

            {gapsState.status === "loaded" && gapsState.gaps.length > 0 && (
              <div className="space-y-6">
                {gapsState.gaps.map((gap) => (
                  <div key={gap.id} className="bg-surface-container-low border border-outline-variant p-5 space-y-4">
                    {gap.source === "ai_suggested" && (
                      <span className="inline-block px-2 py-0.5 border border-outline text-label-sm font-sans text-on-surface-variant">
                        AI-suggested, not yet in our reviewed knowledge base
                      </span>
                    )}
                    <p className="font-sans text-body-md leading-relaxed">
                      <strong className={gap.severity === "important" ? "text-tertiary" : "text-primary"}>
                        {gap.ceremonyName}:
                      </strong>{" "}
                      {gap.reason}
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleAddGapToPlan(gap)}
                        className="flex-1 py-3 px-4 bg-primary text-on-primary font-sans text-label-lg hover:opacity-90 active:scale-95 transition-all"
                      >
                        Add to plan
                      </button>
                      <button
                        onClick={() => handleDismissGap(gap)}
                        className="px-4 py-3 border border-outline font-sans text-label-lg text-on-surface hover:bg-surface-container transition-all"
                      >
                        Not relevant
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
      )}

      {activeTab === "vendors" && (
        <EventVendorsTab
          eventId={event.id}
          event={event}
          venueManagerPhone={venueManagerPhone}
          onViewTask={handleViewTask}
        />
      )}

      {activeTab === "activity" && <EventActivityTab eventId={event.id} />}
    </div>
  );
}
