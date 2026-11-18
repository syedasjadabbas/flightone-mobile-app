// Copied from the web app's client/lib/bookings/travellerAutoFill.ts — keep the two in step.
import type { Companion, IdentityDocument, TravellerProfile } from "../api/types";

/** Airline titles TPConnects accepts; the traveller picks one — never inferred from a name. */
export const TRAVELLER_TITLES = ["MR", "MRS", "MS", "MISS", "MSTR"] as const;

const TITLE_GENDER: Record<string, string> = { MR: "M", MSTR: "M", MRS: "F", MS: "F", MISS: "F" };

/**
 * The airline checks title against the passport gender: "Ms" on a male passport fails at
 * booking ("Unable to perform air booking step"), after payment. X (unspecified) fits any title.
 */
export function titleGenderConflict(title?: string, gender?: string): boolean {
  const expected = TITLE_GENDER[(title ?? "").trim().toUpperCase()];
  const g = (gender ?? "").trim().toUpperCase();
  return Boolean(expected && (g === "M" || g === "F") && g !== expected);
}

export interface TravellerFormData {
  /** MR / MRS / MS / MISS / MSTR — chosen by the traveller. */
  title?: string;
  /** M / F / X as on the passport — chosen by the traveller; airlines need it with passport details. */
  gender?: string;
  givenName: string;
  surname: string;
  nationality: string;
  dateOfBirth: string;
  passportNumber: string;
  passportExpiry: string;
  phone: string;
  email: string;
  companionId?: string | null;
  isAutoFilled?: boolean;
  sourceLabel?: string;
}

export function splitFullName(fullName: string | null | undefined): {
  givenName: string;
  surname: string;
} {
  const trimmed = String(fullName || "").trim();
  if (!trimmed) {
    return { givenName: "", surname: "" };
  }

  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { givenName: parts[0], surname: "" };
  }

  const surname = parts[parts.length - 1];
  const givenName = parts.slice(0, -1).join(" ");
  return { givenName, surname };
}

export function formatDateForInput(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

/**
 * The account holder's own active passport in the Traveller Vault. The vault list omits
 * the number; checkout fetches this one document with it (owner-only, audited).
 */
export function isPrimaryPassport(doc: IdentityDocument): boolean {
  return doc.type === "PASSPORT" && doc.status === "ACTIVE" && !doc.companionId;
}

export function resolvePrimaryTraveller(
  profile?: TravellerProfile | null,
  documents?: IdentityDocument[] | null,
  user?: { name?: string | null; email?: string | null } | null,
): TravellerFormData {
  const nameToSplit = profile?.displayName || user?.name || "";
  const { givenName, surname } = splitFullName(nameToSplit);

  const passportDoc = (documents || []).find(isPrimaryPassport);

  const nationality =
    profile?.nationality || passportDoc?.countryCode || "";
  const passportExpiry = formatDateForInput(passportDoc?.expiresAt);
  const passportNumber = passportDoc?.documentNumber || "";
  const phone = profile?.phone || "";
  const email = user?.email || "";

  const hasAnyData = Boolean(
    givenName || surname || nationality || passportExpiry || passportNumber || phone || profile?.dateOfBirth,
  );

  return {
    givenName,
    surname,
    nationality: nationality.toUpperCase(),
    dateOfBirth: formatDateForInput(profile?.dateOfBirth),
    passportNumber,
    passportExpiry,
    phone,
    email,
    companionId: null,
    isAutoFilled: hasAnyData,
    sourceLabel: hasAnyData ? "Primary Profile & Vault" : undefined,
  };
}

export function resolveCompanionTraveller(
  companion: Companion,
  documents?: IdentityDocument[] | null,
): TravellerFormData {
  const { givenName, surname } = splitFullName(companion.fullName);

  // Companion documents if stored in vault
  const compDoc = (documents || []).find(
    (doc) =>
      doc.companionId === companion.id &&
      doc.type === "PASSPORT" &&
      doc.status === "ACTIVE",
  );

  const passportNumber =
    companion.passportNumber || compDoc?.documentNumber || "";
  const passportExpiry = formatDateForInput(
    companion.passportExpiry || compDoc?.expiresAt,
  );
  const dateOfBirth = formatDateForInput(companion.dateOfBirth);
  const nationality = compDoc?.countryCode || "";

  return {
    givenName,
    surname,
    nationality: nationality.toUpperCase(),
    dateOfBirth,
    passportNumber,
    passportExpiry,
    phone: "",
    email: "",
    companionId: companion.id,
    isAutoFilled: true,
    sourceLabel: companion.relationship
      ? `Saved Companion (${companion.relationship})`
      : "Saved Companion",
  };
}

export type TravellerSnapshot = {
  givenName: string;
  surname: string;
  fullName: string;
  nationality?: string;
  dateOfBirth?: string;
  passportNumber?: string;
  passportExpiry?: string;
  phone?: string;
  email?: string;
  [key: string]: unknown;
};

export function buildTravellerSnapshot(
  formData: TravellerFormData,
): TravellerSnapshot {
  const given = formData.givenName.trim();
  const sur = formData.surname.trim();
  const fullName = [given, sur].filter(Boolean).join(" ");

  const snapshot: TravellerSnapshot = {
    givenName: given,
    surname: sur,
    fullName,
  };

  if (formData.title?.trim()) snapshot.title = formData.title.trim().toUpperCase();
  if (formData.gender?.trim()) snapshot.gender = formData.gender.trim().toUpperCase();
  if (formData.nationality.trim()) {
    snapshot.nationality = formData.nationality.trim().toUpperCase();
  }
  if (formData.dateOfBirth.trim()) {
    snapshot.dateOfBirth = formData.dateOfBirth.trim();
  }
  if (formData.passportNumber.trim()) {
    snapshot.passportNumber = formData.passportNumber.trim();
  }
  if (formData.passportExpiry.trim()) {
    snapshot.passportExpiry = formData.passportExpiry.trim();
  }
  if (formData.phone.trim()) {
    snapshot.phone = formData.phone.trim();
  }
  if (formData.email.trim()) {
    snapshot.email = formData.email.trim();
  }
  if (formData.companionId) {
    snapshot.companionId = formData.companionId;
  }

  return snapshot;
}

export function validateTravellerFormData(formData: TravellerFormData): {
  isValid: boolean;
  missingFields: string[];
} {
  const missing: string[] = [];

  if (!formData.givenName.trim()) {
    missing.push("givenName");
  }
  if (!formData.surname.trim()) {
    missing.push("surname");
  }
  // Airlines need a title and contact details to issue a ticket.
  if (!TRAVELLER_TITLES.includes((formData.title ?? "").toUpperCase() as (typeof TRAVELLER_TITLES)[number])) {
    missing.push("title");
  }
  if (!["M", "F", "X"].includes((formData.gender ?? "").toUpperCase())) missing.push("gender");
  if (titleGenderConflict(formData.title, formData.gender)) missing.push("titleGender");
  if (!formData.email.trim()) missing.push("email");
  if (!formData.phone.trim()) missing.push("phone");

  return {
    isValid: missing.length === 0,
    missingFields: missing,
  };
}

const FIELD_LABELS: Record<string, string> = {
  givenName: "given name",
  surname: "surname",
  title: "title",
  gender: "gender",
  email: "email",
  phone: "phone",
};

/** "Add the traveller's title and phone before continuing." */
export function missingTravellerMessage(missingFields: string[]): string {
  if (missingFields.includes("titleGender")) {
    return "The title and gender don't match — Mr is for male, Mrs / Ms / Miss for female. Match them to the passport before continuing.";
  }
  const names = missingFields.map((f) => FIELD_LABELS[f] ?? f);
  if (names.length === 0) return "";
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
  return `Add the traveller's ${list} before continuing.`;
}
