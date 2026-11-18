import { useEffect, useState } from "react";
import { Button, Card, Notice, TextField, DateField } from "@/core/components";
import { formatApiError } from "@/core/api/formatApiError";
import { ChoiceRow } from "@/features/checkout/components/ChoiceRow";
import { useUpdateProfileMutation, type ProfilePatch, type TravellerProfile } from "../api/profileApi";

const CABINS = [
  { value: "ECONOMY", label: "Economy" },
  { value: "PREMIUM_ECONOMY", label: "Premium" },
  { value: "BUSINESS", label: "Business" },
  { value: "FIRST", label: "First" },
] as const;
type Cabin = (typeof CABINS)[number]["value"];

const orNull = (s: string) => (s.trim() ? s.trim() : null);

/** Traveller preferences (PATCH /profile) — same fields and limits as the web form. */
export function PreferencesSection({ profile }: { profile: TravellerProfile }) {
  const [update, { isLoading }] = useUpdateProfileMutation();
  const [form, setForm] = useState(() => toForm(profile));
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  useEffect(() => setForm(toForm(profile)), [profile]);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setMessage(null);
    if (!form.displayName.trim()) return setMessage({ tone: "error", text: "Enter your name." });
    if (form.nationality && !/^[A-Za-z]{2}$/.test(form.nationality.trim())) {
      return setMessage({ tone: "error", text: "Nationality is a 2-letter country code, e.g. PK." });
    }
    if (form.dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(form.dateOfBirth.trim())) {
      return setMessage({ tone: "error", text: "Date of birth looks like 1990-05-21." });
    }
    const layover = form.maxLayoverMinutes.trim() ? Number(form.maxLayoverMinutes) : null;
    if (layover != null && (!Number.isInteger(layover) || layover < 0 || layover > 2880)) {
      return setMessage({ tone: "error", text: "Max layover is 0–2880 minutes." });
    }
    const airlines = form.preferredAirlines
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    const patch: ProfilePatch = {
      displayName: form.displayName.trim(),
      phone: orNull(form.phone),
      nationality: form.nationality.trim() ? form.nationality.trim().toUpperCase() : null,
      dateOfBirth: orNull(form.dateOfBirth),
      seatPref: orNull(form.seatPref),
      mealPref: orNull(form.mealPref),
      preferredCabin: (form.preferredCabin || null) as Cabin | null,
      preferredAirlines: airlines.length ? airlines : null,
      maxLayoverMinutes: layover,
    };
    try {
      await update(patch).unwrap();
      setMessage({ tone: "success", text: "Preferences saved." });
    } catch (err) {
      setMessage({ tone: "error", text: formatApiError(err) });
    }
  };

  return (
    <Card>
      <TextField label="Name" value={form.displayName} onChangeText={set("displayName")} />
      <TextField label="Phone" value={form.phone} onChangeText={set("phone")} keyboardType="phone-pad" />
      <TextField
        label="Nationality"
        hint="2-letter country code"
        value={form.nationality}
        onChangeText={(t) => set("nationality")(t.toUpperCase().slice(0, 2))}
        autoCapitalize="characters"
        maxLength={2}
      />
      <DateField label="Date of birth" value={form.dateOfBirth} onChange={set("dateOfBirth")} maximumDate={new Date()} />
      <ChoiceRow label="Preferred cabin" options={[...CABINS]} value={form.preferredCabin as Cabin} onChange={set("preferredCabin")} />
      <TextField label="Seat preference" placeholder="Aisle, window…" value={form.seatPref} onChangeText={set("seatPref")} />
      <TextField label="Meal preference" placeholder="Halal, vegetarian…" value={form.mealPref} onChangeText={set("mealPref")} />
      <TextField
        label="Preferred airlines"
        hint="Airline codes, comma separated, e.g. EK, QR"
        value={form.preferredAirlines}
        onChangeText={set("preferredAirlines")}
        autoCapitalize="characters"
      />
      <TextField
        label="Max layover (minutes)"
        value={form.maxLayoverMinutes}
        onChangeText={set("maxLayoverMinutes")}
        keyboardType="number-pad"
      />
      {message ? <Notice tone={message.tone} message={message.text} /> : null}
      <Button label="Save preferences" onPress={save} loading={isLoading} />
    </Card>
  );
}

function toForm(p: TravellerProfile) {
  return {
    displayName: p.displayName ?? "",
    phone: p.phone ?? "",
    nationality: p.nationality ?? "",
    dateOfBirth: p.dateOfBirth ? p.dateOfBirth.slice(0, 10) : "",
    seatPref: p.seatPref ?? "",
    mealPref: p.mealPref ?? "",
    preferredCabin: p.preferredCabin ?? "",
    preferredAirlines: (p.preferredAirlines ?? []).join(", "),
    maxLayoverMinutes: p.maxLayoverMinutes != null ? String(p.maxLayoverMinutes) : "",
  };
}
