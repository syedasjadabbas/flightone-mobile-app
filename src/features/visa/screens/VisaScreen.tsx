import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import { Button, Card, ListRow, Notice, Pill, Screen, Tag, TextField } from "@/core/components";
import { formatApiError } from "@/core/api/formatApiError";
import { space, type } from "@/core/theme/tokens";
import { useProfileQuery } from "@/features/profile/api/profileApi";
import {
  useAssessVisaMutation,
  useCreateVisaApplicationMutation,
  useEscalateVisaMutation,
  useVisaApplicationsQuery,
  useVisaCapabilityQuery,
  type VisaAssessment,
  type VisaCategory,
} from "../api/visaApi";

const QUICK_DESTINATIONS = [
  { code: "AE", label: "UAE" },
  { code: "SA", label: "Saudi Arabia" },
  { code: "TR", label: "Türkiye" },
  { code: "GB", label: "UK" },
  { code: "TH", label: "Thailand" },
  { code: "MY", label: "Malaysia" },
];
const PURPOSES = ["Tourism", "Business", "Umrah", "Visiting family", "Transit"];
const CATEGORY_LABEL: Record<VisaCategory, string> = {
  VISA_FREE: "Visa-free",
  VOA: "Visa on arrival",
  E_VISA: "e-Visa",
  EMBASSY: "Embassy visa",
  UNKNOWN: "Unknown",
};
const iso2 = (s: string) => /^[A-Z]{2}$/.test(s);

function ResultCard({ a }: { a: VisaAssessment }) {
  const req = a.requirement;
  const items = a.checklist?.items ?? [];
  const found = items.filter((i) => i.presentHint).length;
  return (
    <Card>
      <View style={styles.row}>
        {req ? <Tag label={CATEGORY_LABEL[req.category] ?? req.category} tone={req.category === "VISA_FREE" ? "success" : "accent"} /> : null}
        <Tag label={a.isFact ? "Verified rule" : "Guidance"} tone={a.isFact ? "success" : "neutral"} />
      </View>
      <Text style={type.body}>{a.avaSummary}</Text>
      {req?.processingDaysMin != null ? (
        <Text style={type.bodySoft}>
          Processing: {req.processingDaysMin}
          {req.processingDaysMax && req.processingDaysMax !== req.processingDaysMin ? `–${req.processingDaysMax}` : ""} days
        </Text>
      ) : null}
      {req?.confidenceNote ? <Text style={type.bodySoft}>{req.confidenceNote}</Text> : null}
      {a.missingInputs.length ? <Notice tone="info" message={`Ava still needs: ${a.missingInputs.join(", ")}`} /> : null}
      {items.length ? (
        <View style={styles.list}>
          <Text style={type.label}>
            Documents ({found}/{items.length} on file)
          </Text>
          {items.map((i) => (
            <Text key={i.item} style={type.bodySoft}>
              {i.presentHint ? "✓" : "○"} {i.item}
            </Text>
          ))}
        </View>
      ) : null}
      {a.heldVisa?.hasMatchingVisaOnFile ? (
        <Notice tone="success" message={`You have a matching visa on file${a.heldVisa.expiresAt ? `, valid until ${a.heldVisa.expiresAt.slice(0, 10)}` : ""}.`} />
      ) : null}
      {(req?.transit ?? []).map((t) => (
        <Text key={t.destinationCode} style={type.bodySoft}>
          Transit {t.destinationCode}: {CATEGORY_LABEL[t.category] ?? t.category}
          {t.transitNotes ? ` — ${t.transitNotes}` : ""}
        </Text>
      ))}
      {req?.source ? <Text style={type.bodySoft}>Source: {req.source}</Text> : null}
    </Card>
  );
}

/** Visa check (POST /visa/assess) and the traveller's own visa cases. */
export function VisaScreen() {
  const { data: capability, error: capError } = useVisaCapabilityQuery();
  const { data: profile } = useProfileQuery();
  const { data: apps } = useVisaApplicationsQuery();
  const [assess, assessState] = useAssessVisaMutation();
  const [createApp, createState] = useCreateVisaApplicationMutation();
  const [escalate, escalateState] = useEscalateVisaMutation();

  const [destination, setDestination] = useState("AE");
  const [nationality, setNationality] = useState("PK");
  const [transit, setTransit] = useState("");
  const [purpose, setPurpose] = useState("Tourism");
  const [result, setResult] = useState<VisaAssessment | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);

  useEffect(() => {
    if (profile?.nationality) setNationality(profile.nationality.toUpperCase());
  }, [profile?.nationality]);

  const transitList = transit
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  const onAssess = async () => {
    setMessage(null);
    if (!iso2(destination) || !iso2(nationality) || !transitList.every(iso2)) {
      return setMessage({ tone: "error", text: "Use 2-letter country codes, e.g. AE, PK." });
    }
    try {
      setResult(await assess({ destination, nationality, purpose, ...(transitList.length ? { transitCountries: transitList } : {}) }).unwrap());
    } catch (err) {
      setMessage({ tone: "error", text: formatApiError(err) });
    }
  };

  const onOpenCase = async () => {
    const nat = result?.traveller.nationality || nationality;
    try {
      await createApp({ nationality: nat, destination, ...(result?.requirement?.category ? { category: result.requirement.category } : {}) }).unwrap();
      setMessage({ tone: "success", text: `Visa case opened for ${destination}.` });
    } catch (err) {
      setMessage({ tone: "error", text: formatApiError(err) });
    }
  };

  const onEscalate = async () => {
    try {
      const r = await escalate({ destination, nationality, reason: `Visa help requested from the app for ${nationality} → ${destination}` }).unwrap();
      setMessage({
        tone: "success",
        text: r.auditOnly ? "Noted — a visa specialist will follow up. You can also message Ava in chat." : "A visa specialist will contact you shortly.",
      });
    } catch (err) {
      setMessage({ tone: "error", text: formatApiError(err) });
    }
  };

  return (
    <Screen edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: "Visa" }} />
      {capError ? <Notice message="Visa advisory is unavailable right now." /> : null}
      {capability && !capability.canLookup ? <Notice tone="info" message={capability.reasons[0] || "Visa lookups aren't configured yet."} /> : null}

      <Card>
        <Text style={type.h3}>Do I need a visa?</Text>
        <View style={styles.row}>
          {QUICK_DESTINATIONS.map((d) => (
            <Pill key={d.code} label={d.label} selected={destination === d.code} onPress={() => setDestination(d.code)} />
          ))}
        </View>
        <TextField label="Destination" hint="2-letter code" value={destination} onChangeText={(t) => setDestination(t.toUpperCase().slice(0, 2))} autoCapitalize="characters" maxLength={2} />
        <TextField label="Passport nationality" hint="2-letter code" value={nationality} onChangeText={(t) => setNationality(t.toUpperCase().slice(0, 2))} autoCapitalize="characters" maxLength={2} />
        <TextField label="Transit countries (optional)" hint="Comma separated, e.g. QA, TR" value={transit} onChangeText={setTransit} autoCapitalize="characters" />
        <View style={styles.row}>
          {PURPOSES.map((p) => (
            <Pill key={p} label={p} selected={purpose === p} onPress={() => setPurpose(p)} />
          ))}
        </View>
        <Button label="Check requirements" onPress={onAssess} loading={assessState.isLoading} disabled={capability ? !capability.canLookup : false} />
        <Text style={type.bodySoft}>Guidance only. Always confirm with the embassy or airline before you travel.</Text>
      </Card>

      {message ? <Notice tone={message.tone} message={message.text} /> : null}
      {result ? <ResultCard a={result} /> : null}
      {result ? (
        <View style={styles.list}>
          <Button label={`Open visa case for ${destination}`} variant="ghost" onPress={onOpenCase} loading={createState.isLoading} />
          <Button label="Ask a visa specialist" variant="ghost" onPress={onEscalate} loading={escalateState.isLoading} />
        </View>
      ) : null}

      <Card>
        <Text style={type.h3}>Your visa cases</Text>
        {apps?.items.length ? (
          apps.items.map((a) => (
            <ListRow
              key={a.id}
              title={`${a.nationalityCode} → ${a.destinationCode} · ${a.status.toLowerCase().replace(/_/g, " ")}`}
              detail={a.appointmentAt ? `Appointment ${new Date(a.appointmentAt).toLocaleString()}${a.appointmentLocation ? ` · ${a.appointmentLocation}` : ""}` : "Pending appointment"}
            />
          ))
        ) : (
          <Text style={type.bodySoft}>No active applications.</Text>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  list: { gap: space.sm },
});
