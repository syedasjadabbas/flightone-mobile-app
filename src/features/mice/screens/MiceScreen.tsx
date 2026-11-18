import { useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { Stack, router } from "expo-router";
import { Button, Card, ListRow, Notice, Pill, Screen, TextField, DateField } from "@/core/components";
import { formatApiError } from "@/core/api/formatApiError";
import { useAuthStore } from "@/core/auth/auth.store";
import { confirmAction } from "@/core/lib/confirm";
import { colors, space, type } from "@/core/theme/tokens";
import { ChoiceRow } from "@/features/checkout/components/ChoiceRow";
import { newIdempotencyKey } from "@/features/groups/lib/groupLabels";
import {
  useCancelMiceEnquiryMutation,
  useCreateMiceEnquiryMutation,
  useCreateMiceEventMutation,
  useMiceEnquiriesQuery,
  useMiceEventsQuery,
  type MiceEventType,
} from "../api/miceApi";

export const MICE_TYPE_LABELS: Record<MiceEventType, string> = {
  MEETING: "Meeting",
  INCENTIVE: "Incentive trip",
  CONFERENCE: "Conference",
  EXHIBITION: "Exhibition",
};
const TYPES = Object.keys(MICE_TYPE_LABELS) as MiceEventType[];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Events (MICE): send an event enquiry to our desk, or run an event workspace. */
export function MiceScreen() {
  const [tab, setTab] = useState<"enquiry" | "events">("enquiry");
  return (
    <Screen edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: "Events & MICE" }} />
      <View style={styles.row}>
        <Pill label="Event enquiry" selected={tab === "enquiry"} onPress={() => setTab("enquiry")} />
        <Pill label="Event workspaces" selected={tab === "events"} onPress={() => setTab("events")} />
      </View>
      {tab === "enquiry" ? <EnquiryTab /> : <EventsTab />}
    </Screen>
  );
}

function EnquiryTab() {
  const user = useAuthStore((s) => s.user);
  const { data } = useMiceEnquiriesQuery();
  const [create, { isLoading }] = useCreateMiceEnquiryMutation();
  const [cancel] = useCancelMiceEnquiryMutation();
  const [f, setF] = useState({
    name: "",
    type: "CONFERENCE" as MiceEventType,
    organization: "",
    destination: "",
    origin: "",
    startsAt: "",
    endsAt: "",
    attendees: "50",
    budget: "",
    contactName: user?.name ?? "",
    contactEmail: user?.email ?? "",
    contactPhone: "",
    flightsRequired: true,
    hotelsRequired: true,
    transfersRequired: false,
    meetingSpaceRequired: true,
    cateringRequired: false,
    visaAssistanceRequired: false,
    notes: "",
  });
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const set = <K extends keyof typeof f>(k: K) => (v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    setMsg(null);
    const attendees = Number(f.attendees);
    if (!f.name.trim() || f.destination.trim().length < 2) return setMsg({ tone: "error", text: "Add an event name and destination." });
    if (!DATE.test(f.startsAt) || !DATE.test(f.endsAt) || f.endsAt < f.startsAt) {
      return setMsg({ tone: "error", text: "Event dates look like 2027-03-10, and the end can't be before the start." });
    }
    if (!Number.isInteger(attendees) || attendees < 1 || attendees > 5000) return setMsg({ tone: "error", text: "Attendees must be 1–5000." });
    if (!f.contactName.trim() || !/^\S+@\S+\.\S+$/.test(f.contactEmail.trim())) return setMsg({ tone: "error", text: "Add a contact name and email." });
    const budget = f.budget.trim() ? Number(f.budget) : null;
    if (budget != null && (!Number.isFinite(budget) || budget < 0)) return setMsg({ tone: "error", text: "Budget must be a number." });
    try {
      await create({
        name: f.name.trim(),
        type: f.type,
        destination: f.destination.trim(),
        ...(f.origin.trim() ? { origin: f.origin.trim() } : {}),
        ...(f.organization.trim() ? { organization: f.organization.trim() } : {}),
        // Local 09:00–18:00 on the chosen days, so a one-day event still ends after it starts.
        eventStartsAt: new Date(`${f.startsAt}T09:00:00`).toISOString(),
        eventEndsAt: new Date(`${f.endsAt}T18:00:00`).toISOString(),
        attendeeCount: attendees,
        ...(budget != null ? { budgetMinor: Math.round(budget * 100), currency: "PKR" } : {}),
        contactName: f.contactName.trim(),
        contactEmail: f.contactEmail.trim(),
        ...(f.contactPhone.trim() ? { contactPhone: f.contactPhone.trim() } : {}),
        flightsRequired: f.flightsRequired,
        hotelsRequired: f.hotelsRequired,
        transfersRequired: f.transfersRequired,
        meetingSpaceRequired: f.meetingSpaceRequired,
        cateringRequired: f.cateringRequired,
        visaAssistanceRequired: f.visaAssistanceRequired,
        ...(f.notes.trim() ? { notes: f.notes.trim() } : {}),
        idempotencyKey: newIdempotencyKey(),
      }).unwrap();
      setMsg({ tone: "success", text: "Enquiry sent to our events desk. No venues, flights or hotels have been confirmed yet." });
      setF((p) => ({ ...p, name: "", destination: "", notes: "" }));
    } catch (err) {
      setMsg({ tone: "error", text: formatApiError(err) });
    }
  };

  const toggle = (label: string, key: "flightsRequired" | "hotelsRequired" | "transfersRequired" | "meetingSpaceRequired" | "cateringRequired" | "visaAssistanceRequired") => (
    <View style={styles.toggle}>
      <Text style={type.body}>{label}</Text>
      <Switch value={f[key]} onValueChange={set(key)} trackColor={{ true: colors.accent }} accessibilityLabel={label} />
    </View>
  );

  return (
    <>
      <Card>
        <Text style={type.h3}>Plan an event</Text>
        <ChoiceRow label="Type" options={TYPES.map((t) => ({ value: t, label: MICE_TYPE_LABELS[t] }))} value={f.type} onChange={set("type")} />
        <TextField label="Event name" value={f.name} onChangeText={set("name")} maxLength={200} />
        <TextField label="Organisation (optional)" value={f.organization} onChangeText={set("organization")} />
        <TextField label="Destination city" value={f.destination} onChangeText={set("destination")} maxLength={80} />
        <TextField label="Travelling from (optional)" value={f.origin} onChangeText={set("origin")} maxLength={80} />
        <DateField label="Event starts" value={f.startsAt} onChange={set("startsAt")} minimumDate={new Date()} />
        <DateField label="Event ends" value={f.endsAt} onChange={set("endsAt")} minimumDate={new Date()} />
        <TextField label="Attendees" value={f.attendees} onChangeText={set("attendees")} keyboardType="number-pad" />
        <TextField label="Budget in PKR (optional)" value={f.budget} onChangeText={set("budget")} keyboardType="number-pad" />
        <TextField label="Contact name" value={f.contactName} onChangeText={set("contactName")} />
        <TextField label="Contact email" value={f.contactEmail} onChangeText={set("contactEmail")} keyboardType="email-address" autoCapitalize="none" />
        <TextField label="Contact phone (optional)" value={f.contactPhone} onChangeText={set("contactPhone")} keyboardType="phone-pad" />
        {toggle("Flights", "flightsRequired")}
        {toggle("Hotels", "hotelsRequired")}
        {toggle("Airport transfers", "transfersRequired")}
        {toggle("Meeting space", "meetingSpaceRequired")}
        {toggle("Catering", "cateringRequired")}
        {toggle("Visa assistance", "visaAssistanceRequired")}
        <TextField label="Notes (optional)" value={f.notes} onChangeText={set("notes")} multiline maxLength={4000} />
        {msg ? <Notice tone={msg.tone} message={msg.text} /> : null}
        <Button label="Send enquiry" onPress={submit} loading={isLoading} />
      </Card>
      <Card>
        <Text style={type.h3}>Your enquiries</Text>
        {data?.items.length ? (
          data.items.map((e) => (
            <ListRow
              key={e.id}
              title={`${e.name} · ${e.destination}`}
              detail={`${MICE_TYPE_LABELS[e.type]} · ${e.attendeeCount} attendees · ${e.status.toLowerCase().replace("_", " ")} · ${e.eventStartsAt.slice(0, 10)}`}
              actionLabel={e.status === "CANCELLED" ? undefined : "Cancel"}
              onAction={
                e.status === "CANCELLED"
                  ? undefined
                  : async () => {
                      if (await confirmAction("Cancel enquiry?", e.name, "Cancel enquiry")) cancel({ id: e.id });
                    }
              }
            />
          ))
        ) : (
          <Text style={type.bodySoft}>No enquiries yet.</Text>
        )}
      </Card>
    </>
  );
}

function EventsTab() {
  const { data: events = [] } = useMiceEventsQuery();
  const [create, { isLoading }] = useCreateMiceEventMutation();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<MiceEventType>("MEETING");
  const [starts, setStarts] = useState("");
  const [ends, setEnds] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <>
      <Card>
        <Text style={type.h3}>Your event workspaces</Text>
        {events.length ? (
          events.map((e) => (
            <ListRow
              key={e.id}
              title={e.name}
              detail={`${MICE_TYPE_LABELS[e.type]} · ${e.startsAt.slice(0, 10)}${e.venue ? ` · ${e.venue}` : ""}`}
              actionLabel="Open"
              tone="accent"
              onAction={() => router.push({ pathname: "/mice/[eventId]", params: { eventId: e.id } })}
            />
          ))
        ) : (
          <Text style={type.bodySoft}>No event workspaces yet.</Text>
        )}
      </Card>
      <Card>
        <Text style={type.h3}>Quick create</Text>
        <TextField label="Event name" value={name} onChangeText={setName} maxLength={200} />
        <ChoiceRow label="Type" options={TYPES.map((t) => ({ value: t, label: MICE_TYPE_LABELS[t] }))} value={kind} onChange={setKind} />
        <DateField label="Starts" value={starts} onChange={setStarts} minimumDate={new Date()} />
        <DateField label="Ends" value={ends} onChange={setEnds} minimumDate={new Date()} />
        {msg ? <Notice message={msg} /> : null}
        <Button
          label="Create workspace"
          loading={isLoading}
          onPress={async () => {
            setMsg(null);
            if (!name.trim() || !DATE.test(starts) || !DATE.test(ends) || ends < starts) {
              return setMsg("Add a name and dates like 2027-03-10 (end on or after start).");
            }
            try {
              const e = await create({
                name: name.trim(),
                type: kind,
                startsAt: new Date(`${starts}T09:00:00`).toISOString(),
                endsAt: new Date(`${ends}T18:00:00`).toISOString(),
                autoCreateGroup: true,
              }).unwrap();
              setName("");
              router.push({ pathname: "/mice/[eventId]", params: { eventId: e.id } });
            } catch (err) {
              setMsg(formatApiError(err));
            }
          }}
        />
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  toggle: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 44 },
});
