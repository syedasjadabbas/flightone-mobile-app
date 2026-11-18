import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Button, Card, EmptyState, Notice, PageHeader, Pill, Screen, SectionLabel, TextField, TINT } from "@/core/components";
import { formatApiError } from "@/core/api/formatApiError";
import { colors, fonts, space, type } from "@/core/theme/tokens";
import { useProfileQuery } from "@/features/profile/api/profileApi";
import { ToneTag, type Tone } from "@/features/vault/components/ToneTag";
import {
  useAssessVisaMutation,
  useCreateVisaApplicationMutation,
  useEscalateVisaMutation,
  useVisaApplicationsQuery,
  useVisaCapabilityQuery,
  type VisaApplication,
  type VisaAssessment,
} from "../api/visaApi";
import { CATEGORY_LABEL, VerdictCard } from "../components/VerdictCard";

const QUICK_DESTINATIONS = [
  { code: "AE", label: "UAE" },
  { code: "SA", label: "Saudi Arabia" },
  { code: "TR", label: "Türkiye" },
  { code: "GB", label: "UK" },
  { code: "TH", label: "Thailand" },
  { code: "MY", label: "Malaysia" },
];
const PURPOSES = ["Tourism", "Business", "Umrah", "Visiting family", "Transit"];
const iso2 = (s: string) => /^[A-Z]{2}$/.test(s);

/** "IN_PROCESS" → "In process". */
const statusLabel = (s: string) => s.toLowerCase().replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
function statusTone(s: string): Tone {
  const u = s.toUpperCase();
  if (/APPROV|ISSUED|COMPLET|GRANT/.test(u)) return "success";
  if (/REJECT|DENI|CANCEL|EXPIR|FAIL/.test(u)) return "danger";
  if (/SUBMIT|PROCESS|REVIEW|APPOINT|SCHEDUL/.test(u)) return "info";
  if (/PENDING|DRAFT|OPEN|NEW/.test(u)) return "warn";
  return "neutral";
}

function CaseRow({ a, last }: { a: VisaApplication; last: boolean }) {
  const t = TINT.green;
  return (
    <View style={[styles.case, !last && styles.divider]}>
      <View style={[styles.badge, { backgroundColor: t.bg }]}>
        <Ionicons name="airplane-outline" size={17} color={t.fg} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.caseTitle}>
          {a.nationalityCode} → {a.destinationCode}
          {a.category ? <Text style={styles.caseCat}>  ·  {CATEGORY_LABEL[a.category] ?? a.category}</Text> : null}
        </Text>
        <Text style={styles.caseDetail}>
          {a.appointmentAt
            ? `Appointment ${new Date(a.appointmentAt).toLocaleString()}${a.appointmentLocation ? ` · ${a.appointmentLocation}` : ""}`
            : "Pending appointment"}
        </Text>
      </View>
      <ToneTag label={statusLabel(a.status)} tone={statusTone(a.status)} />
    </View>
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

  // Prefill the passport country from the profile once it loads (and if it changes).
  const [seenNationality, setSeenNationality] = useState<string | null | undefined>(undefined);
  if (profile?.nationality && profile.nationality !== seenNationality) {
    setSeenNationality(profile.nationality);
    setNationality(profile.nationality.toUpperCase());
  }

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

  const cases = apps?.items ?? [];
  const withAppointment = cases.filter((a) => a.appointmentAt).length;

  return (
    <Screen edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: "Visa" }} />
      <PageHeader
        icon="document-text"
        tint="green"
        subtitle="Check entry rules for your passport, then track your visa cases in one place."
        stats={[
          { value: nationality || "—", label: "Passport" },
          { value: cases.length, label: "Visa cases" },
          { value: withAppointment, label: "Appointments" },
        ]}
      />
      {capError ? <Notice message="Visa advisory is unavailable right now." /> : null}
      {capability && !capability.canLookup ? <Notice tone="info" message={capability.reasons[0] || "Visa lookups aren't configured yet."} /> : null}

      <Card title="Do I need a visa?" subtitle="Pick a destination and purpose" icon="search" tint="green">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipScroll}>
          {QUICK_DESTINATIONS.map((d) => (
            <Pill key={d.code} label={d.label} selected={destination === d.code} onPress={() => setDestination(d.code)} />
          ))}
        </ScrollView>
        <View style={styles.route}>
          <View style={styles.flex}>
            <TextField
              label="Passport"
              hint="2-letter code"
              value={nationality}
              onChangeText={(t) => setNationality(t.toUpperCase().slice(0, 2))}
              autoCapitalize="characters"
              maxLength={2}
            />
          </View>
          <View style={styles.arrow}>
            <Ionicons name="arrow-forward" size={18} color={colors.inkFaint} />
          </View>
          <View style={styles.flex}>
            <TextField
              label="Destination"
              hint="2-letter code"
              value={destination}
              onChangeText={(t) => setDestination(t.toUpperCase().slice(0, 2))}
              autoCapitalize="characters"
              maxLength={2}
            />
          </View>
        </View>
        <TextField label="Transit countries (optional)" hint="Comma separated, e.g. QA, TR" value={transit} onChangeText={setTransit} autoCapitalize="characters" />
        <View style={styles.block}>
          <Text style={type.label}>Purpose</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipScroll}>
            {PURPOSES.map((p) => (
              <Pill key={p} label={p} selected={purpose === p} onPress={() => setPurpose(p)} />
            ))}
          </ScrollView>
        </View>
        <Button label="Check requirements" onPress={onAssess} loading={assessState.isLoading} disabled={capability ? !capability.canLookup : false} />
        <Text style={styles.foot}>Guidance only. Always confirm with the embassy or airline before you travel.</Text>
      </Card>

      {message ? <Notice tone={message.tone} message={message.text} /> : null}
      {result ? (
        <VerdictCard
          a={result}
          destination={destination}
          nationality={nationality}
          actions={
            <View style={styles.actions}>
              <Button label={`Open visa case for ${destination}`} onPress={onOpenCase} loading={createState.isLoading} />
              <Button label="Ask a visa specialist" variant="ghost" onPress={onEscalate} loading={escalateState.isLoading} />
            </View>
          }
        />
      ) : null}

      <SectionLabel right={cases.length ? <Text style={styles.count}>{cases.length}</Text> : undefined}>Your visa cases</SectionLabel>
      {cases.length ? (
        <Card style={styles.list}>
          {cases.map((a, i) => (
            <CaseRow key={a.id} a={a} last={i === cases.length - 1} />
          ))}
        </Card>
      ) : (
        <EmptyState
          icon="briefcase-outline"
          tint="green"
          title="No active applications"
          body="Run a check above, then open a visa case to track documents and appointments here."
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 3 },
  block: { gap: space.xs },
  chipScroll: { marginHorizontal: -space.lg },
  chips: { gap: space.sm, paddingHorizontal: space.lg },
  route: { flexDirection: "row", alignItems: "flex-start", gap: space.sm },
  arrow: { paddingTop: 38 },
  foot: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.inkFaint, textAlign: "center" },
  actions: { gap: space.sm },
  count: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.inkFaint, marginRight: space.xs },
  list: { paddingVertical: space.xs, gap: 0 },
  case: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.md },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  badge: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  caseTitle: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.ink },
  caseCat: { fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft },
  caseDetail: { fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft },
});
