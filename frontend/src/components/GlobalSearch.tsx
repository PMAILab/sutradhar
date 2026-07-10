import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listEvents, listVendors, type EventSummary, type Vendor } from "../lib/api";

interface Results {
  events: EventSummary[];
  vendors: (Vendor & { eventName: string })[];
}

const EMPTY_RESULTS: Results = { events: [], vendors: [] };

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Results>(EMPTY_RESULTS);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults(EMPTY_RESULTS);
      return;
    }
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const [{ events }, { vendors }] = await Promise.all([listEvents(), listVendors()]);
        const needle = trimmed.toLowerCase();
        const matchedEvents = events.filter(
          (e) => e.coupleNames?.toLowerCase().includes(needle) || e.city?.toLowerCase().includes(needle),
        );
        const eventNameById = new Map(events.map((e) => [e.id, e.coupleNames ?? "Untitled wedding"]));
        const matchedVendors = vendors
          .filter((v) => v.name.toLowerCase().includes(needle) || v.role.toLowerCase().includes(needle))
          .map((v) => ({ ...v, eventName: eventNameById.get(v.eventId) ?? "Unknown wedding" }));
        setResults({ events: matchedEvents.slice(0, 5), vendors: matchedVendors.slice(0, 5) });
      } catch {
        setResults(EMPTY_RESULTS);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  const hasResults = results.events.length > 0 || results.vendors.length > 0;
  const showDropdown = open && query.trim().length >= 2;

  function goToEvent(id: string) {
    navigate(`/events/${id}`);
    setOpen(false);
    setQuery("");
  }

  function goToVendor(eventId: string) {
    navigate(`/events/${eventId}?tab=vendors`);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg pointer-events-none">
        search
      </span>
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search events, vendors..."
        className="w-full bg-surface-container-low border border-outline-variant rounded-full py-2 pl-10 pr-4 font-sans text-body-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary transition-colors"
      />

      {showDropdown && (
        <div className="absolute mt-2 w-full bg-surface border border-outline-variant rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {loading && <p className="p-4 font-sans text-body-sm text-on-surface-variant">Searching...</p>}

          {!loading && !hasResults && (
            <p className="p-4 font-sans text-body-sm text-on-surface-variant">
              No events or vendors match "{query.trim()}".
            </p>
          )}

          {!loading && results.events.length > 0 && (
            <div className="py-2">
              <p className="px-4 py-1 font-sans text-label-sm text-on-surface-variant uppercase tracking-widest">
                Weddings
              </p>
              {results.events.map((event) => (
                <button
                  key={event.id}
                  onClick={() => goToEvent(event.id)}
                  className="w-full text-left px-4 py-2 hover:bg-surface-container-low transition-colors"
                >
                  <p className="font-sans text-body-md text-on-surface">{event.coupleNames ?? "Untitled wedding"}</p>
                  <p className="font-sans text-label-sm text-on-surface-variant">
                    {event.city ?? "City not set"}
                    {event.weddingDate ? ` · ${event.weddingDate}` : ""}
                  </p>
                </button>
              ))}
            </div>
          )}

          {!loading && results.vendors.length > 0 && (
            <div className="py-2 border-t border-outline-variant">
              <p className="px-4 py-1 font-sans text-label-sm text-on-surface-variant uppercase tracking-widest">
                Vendors
              </p>
              {results.vendors.map((vendor) => (
                <button
                  key={vendor.id}
                  onClick={() => goToVendor(vendor.eventId)}
                  className="w-full text-left px-4 py-2 hover:bg-surface-container-low transition-colors"
                >
                  <p className="font-sans text-body-md text-on-surface">{vendor.name}</p>
                  <p className="font-sans text-label-sm text-on-surface-variant">
                    {vendor.role} · {vendor.eventName}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
