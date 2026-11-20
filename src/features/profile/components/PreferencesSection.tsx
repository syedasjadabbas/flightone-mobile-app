import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Card, Notice, TextField, DateField } from "@/core/components";
import { formatApiError } from "@/core/api/formatApiError";
import { space } from "@/core/theme/tokens";
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

const SEATS = [
  { value: "Window", label: "Window" },
  { value: "Aisle", label: "Aisle" },
  { value: "ANY", label: "No preference" },
];
const LAYOVERS = [
  { value: "120", label: "2 h" },
  { value: "240", label: "4 h" },
  { value: "480", label: "8 h" },
  { value: "ANY", label: "Any" },
];
/** Match a saved free-text seat ("window seat", "AISLE") to a chip. */
function seatChip(v: string) {
  const l = v.trim().toLowerCase();
  if (!l) return "ANY";
  if (l.includes("window")) return "Window";
  if (l.includes("aisle")) return "Aisle";
  return undefined;
}

/** Traveller preferences (PATCH /profile) — same fields and limits as the web form. */
export function PreferencesSection({ profile }: { profile: TravellerProfile }) {
  const [update, { isLoading }] = useUpdateProfileMutation();
  const [form, setForm] = useState(() => toForm(profile));
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  // Refill the form when the saved profile changes (e.g. after saving), without an effect.
  const [seenProfile, setSeenProfile] = useState(profile);
  if (profile !== seenProfile) {
    setSeenProfile(profile);
    setForm(toForm(profile));
  }
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
    <>
      <Card title="About you" subtitle="Used on tickets, exactly as on your passport" icon="person-outline">
        <TextField label="Full name" icon="person-outline" value={form.displayName} onChangeText={set("displayName")} />
        <TextField label="Phone" icon="call-outline" value={form.phone} onChangeText={set("phone")} keyboardType="phone-pad" />
        <View style={styles.pair}>
          <View style={styles.narrow}>
            <TextField
              label="Nationality"
              hint="e.g. PK"
              value={form.nationality}
              onChangeText={(t) => set("nationality")(t.toUpperCase().slice(0, 2))}
              autoCapitalize="characters"
              maxLength={2}
            />
          </View>
          <View style={styles.flex}>
            <DateField label="Date of birth" value={form.dateOfBirth} onChange={set("dateOfBirth")} maximumDate={new Date()} />
          </View>
        </View>
      </Card>

      <Card title="Travel preferences" subtitle="Ava uses these when she searches" icon="airplane-outline" tint="teal">
        <ChoiceRow label="Cabin" options={[...CABINS]} value={form.preferredCabin as Cabin} onChange={set("preferredCabin")} />
        <ChoiceRow label="Seat" options={SEATS} value={seatChip(form.seatPref)} onChange={(v) => set("seatPref")(v === "ANY" ? "" : v)} />
        <ChoiceRow
          label="Longest layover"
          options={LAYOVERS}
          value={form.maxLayoverMinutes.trim() ? (LAYOVERS.some((l) => l.value === form.maxLayoverMinutes.trim()) ? form.maxLayoverMinutes.trim() : undefined) : "ANY"}
          onChange={(v) => set("maxLayoverMinutes")(v === "ANY" ? "" : v)}
        />
        <TextField label="Meal" icon="restaurant-outline" placeholder="Halal, vegetarian…" value={form.mealPref} onChangeText={set("mealPref")} />
        <TextField
          label="Favourite airlines"
          icon="ribbon-outline"
          placeholder="EK, QR, TK"
          hint="Airline codes, comma separated"
          value={form.preferredAirlines}
          onChangeText={set("preferredAirlines")}
          autoCapitalize="characters"
        />
        {message ? <Notice tone={message.tone} message={message.text} /> : null}
        <Button label="Save changes" onPress={save} loading={isLoading} />
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pair: { flexDirection: "row", gap: space.sm, alignItems: "flex-start" },
  narrow: { width: 108 },
});

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
