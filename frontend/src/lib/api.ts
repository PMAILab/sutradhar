const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export interface PlanTask {
  id: string;
  title: string;
  vendor: string | null;
  status: "pending" | "confirmed" | "needs_review";
}

export interface PlanCeremony {
  id: string;
  name: string;
  tasks: PlanTask[];
  notes: string | null;
}

export type Tradition = "hindu_north_indian" | "muslim_nikah" | "sikh_anand_karaj";

export interface StructuredPlan {
  coupleNames: string | null;
  weddingDate: string | null;
  tradition: Tradition | "unspecified";
  traditionConfidence: "high" | "medium" | "low";
  ceremonies: PlanCeremony[];
}

export interface Gap {
  id: string;
  ceremonyId: string;
  ceremonyName: string;
  label: string;
  reason: string;
  severity: "important" | "worth_checking";
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: "Something went wrong" }));
    throw new Error(body.error ?? `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function parseIntake(rawText: string): Promise<{ plan: StructuredPlan }> {
  return request("/api/intake/parse", {
    method: "POST",
    body: JSON.stringify({ rawText }),
  });
}

export function checkGaps(
  plan: StructuredPlan,
  dismissedGapIds: string[],
): Promise<{ gaps: Gap[]; note?: string }> {
  return request("/api/copilot/check-gaps", {
    method: "POST",
    body: JSON.stringify({ plan, dismissedGapIds }),
  });
}
