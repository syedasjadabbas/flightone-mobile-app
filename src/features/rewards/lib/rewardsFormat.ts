// Copied from the web app's client/app/rewards/_components/rewardsFormat.ts — keep the two in step.
export function labelize(id: string): string {
  return id.replace(/_/g, " ");
}

export function formatPts(points: number): string {
  return points >= 0 ? `+${points}` : String(points);
}
