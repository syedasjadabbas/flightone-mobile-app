/** The Profile hub's rows, each opening `/profile/[section]`. */
export type SectionKey = "preferences" | "companions" | "loyalty" | "documents" | "emergency" | "security" | "history";

export const SECTIONS: Record<SectionKey, { title: string; detail: string }> = {
  preferences: { title: "Personal & preferences", detail: "Name, phone, seat, meal, airlines" },
  companions: { title: "Travel companions", detail: "People you often book for" },
  loyalty: { title: "Loyalty programmes", detail: "Frequent flyer numbers" },
  documents: { title: "Passports & IDs", detail: "Scan or add travel documents" },
  emergency: { title: "Emergency contacts", detail: "Who we call if something goes wrong" },
  security: { title: "Sign-in & security", detail: "2-step verification, devices" },
  history: { title: "Travel history", detail: "Where you've been" },
};

export const GROUPS: { title: string; keys: SectionKey[] }[] = [
  { title: "You", keys: ["preferences", "documents", "emergency"] },
  { title: "Travel", keys: ["companions", "loyalty", "history"] },
  { title: "Account", keys: ["security"] },
];

export function isSectionKey(v: unknown): v is SectionKey {
  return typeof v === "string" && v in SECTIONS;
}

/** Which row fixes a missing-profile item reported by the server. */
export function sectionForMissing(key: string): SectionKey {
  if (key === "passport") return "documents";
  if (key === "emergencyContact") return "emergency";
  return "preferences";
}

const MISSING_LABEL: Record<string, string> = {
  displayName: "Your name",
  phone: "Phone number",
  seatPref: "Seat preference",
  mealPref: "Meal preference",
  preferredAirlines: "Preferred airlines",
  passport: "Passport",
  emergencyContact: "Emergency contact",
};

/** "seatPref" → "Seat preference" (unknown keys are split from camelCase). */
export function missingLabel(key: string): string {
  return MISSING_LABEL[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^\w/, (c) => c.toUpperCase());
}
