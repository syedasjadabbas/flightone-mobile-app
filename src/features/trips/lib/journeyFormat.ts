// Copied from the web app's client/app/journey/_components/journeyFormat.ts — keep the two in step.
export function formatTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export type EventTone = "calm" | "attention" | "critical";

export function eventTone(type: string, severity: number): EventTone {
  if (type === "CANCELLED" || severity >= 3) return "critical";
  if (
    type === "DELAY" ||
    type === "GATE_CHANGE" ||
    type === "TERMINAL_CHANGE" ||
    type === "WEATHER"
  ) {
    return "attention";
  }
  return "calm";
}

