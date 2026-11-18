/** Small display helpers for offer cards. */

export function formatDuration(minutes: number | undefined | null): string {
  if (!minutes || minutes <= 0) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

export function formatStops(stops: number | undefined | null): string {
  if (!stops) return "Non-stop";
  return stops === 1 ? "1 stop" : `${stops} stops`;
}

const ANGLE_LABELS: Record<string, string> = {
  best_value: "Best value",
  cheapest: "Cheapest",
  fastest: "Fastest",
  premium: "Premium",
  top_rated: "Top rated",
  recommended: "Recommended",
};

export function angleLabel(angle: string | undefined): string | null {
  if (!angle) return null;
  return ANGLE_LABELS[angle] ?? angle.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export function stars(n: number | undefined): string {
  if (!n || n < 1) return "";
  return "★".repeat(Math.min(5, Math.round(n)));
}
