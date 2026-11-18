import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Stack, router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Button, Card, EmptyState, Notice, PageHeader, Screen, SectionLabel, Segmented, TINT, TextField, DateField } from "@/core/components";
import { formatApiError } from "@/core/api/formatApiError";
import { useAuthStore } from "@/core/auth/auth.store";
import { confirmAction } from "@/core/lib/confirm";
import { colors, fonts, radius, shadow, space, type } from "@/core/theme/tokens";
import { ChoiceRow } from "@/features/checkout/components/ChoiceRow";
import { FormSection, HeaderToggle, Row, SwitchRow, requestTag } from "@/features/groups/components/GroupUi";
import { newIdempotencyKey } from "@/features/groups/lib/groupLabels";
import {
  useCancelMiceEnquiryMutation,
  useCreateMiceEnquiryMutation,
  useCreateMiceEventMutation,
  useMiceEnquiriesQuery,
  useMiceEventsQuery,
  type MiceEventType,
} from "../api/miceApi";
import { DateBlock, dateRange } from "../components/DateBlock";

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
  const { data: events = [] } = useMiceEventsQuery();
  const { data: enquiries } = useMiceEnquiriesQuery();
  const [now] = useState(() => Date.now());
  const upcoming = events.filter((e) => new Date(e.endsAt).getTime() >= now).length;
  const openEnquiries = (enquiries?.items ?? []).filter((e) => e.status !== "CANCELLED").length;

  return (
    <Screen edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: "Events & MICE" }} />
      <PageHeader
        icon="calendar-outline"
        tint="violet"
        subtitle="Plan meetings, incentives, conferences and exhibitions with our events desk."
        stats={[
          { value: openEnquiries, label: "Open enquiries" },
          { value: upcoming, label: "Upcoming" },
          { value: events.length, label: "Workspaces" },
        ]}
      />
      <Segmented
        options={[
          { value: "enquiry", label: "Enquiries", count: openEnquiries },
          { value: "events", label: "Workspaces", count: events.length },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "enquiry" ? <EnquiryTab /> : <EventsTab />}
    </Screen>
  );
}

function EnquiryTab() {
  const user = useAuthStore((s) => s.user);
  const { data } = useMiceEnquiriesQuery();
  const [create, { isLoading }] = useCreateMiceEnquiryMutation();
  const [cancel] = useCancelMiceEnquiryMutation();
  const [open, setOpen] = useState(false);
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
      setOpen(false);
    } catch (err) {
      setMsg({ tone: "error", text: formatApiError(err) });
    }
  };

  const items = data?.items ?? [];

  return (
    <>
      {open ? (
        <Card icon="calendar-outline" tint="violet" title="Plan an event" subtitle="Our events desk replies with options" right={<HeaderToggle open label="Plan" onPress={() => setOpen(false)} />}>
          <FormSection title="Event">
            <ChoiceRow label="Type" options={TYPES.map((t) => ({ value: t, label: MICE_TYPE_LABELS[t] }))} value={f.type} onChange={set("type")} />
            <TextField label="Event name" value={f.name} onChangeText={set("name")} maxLength={200} />
            <TextField label="Organisation (optional)" value={f.organization} onChangeText={set("organization")} />
            <View style={styles.row}>
              <View style={styles.flex}>
                <TextField label="Destination city" value={f.destination} onChangeText={set("destination")} maxLength={80} />
              </View>
              <View style={styles.flex}>
                <TextField label="From (optional)" value={f.origin} onChangeText={set("origin")} maxLength={80} />
              </View>
            </View>
          </FormSection>
          <FormSection title="Dates & size">
            <DateField label="Event starts" value={f.startsAt} onChange={set("startsAt")} minimumDate={new Date()} />
            <DateField label="Event ends" value={f.endsAt} onChange={set("endsAt")} minimumDate={new Date()} />
            <View style={styles.row}>
              <View style={styles.flex}>
                <TextField label="Attendees" value={f.attendees} onChangeText={set("attendees")} keyboardType="number-pad" />
              </View>
              <View style={styles.flex}>
                <TextField label="Budget PKR (optional)" value={f.budget} onChangeText={set("budget")} keyboardType="number-pad" />
              </View>
            </View>
          </FormSection>
          <FormSection title="Contact">
            <TextField label="Contact name" value={f.contactName} onChangeText={set("contactName")} />
            <TextField label="Contact email" value={f.contactEmail} onChangeText={set("contactEmail")} keyboardType="email-address" autoCapitalize="none" />
            <TextField label="Contact phone (optional)" value={f.contactPhone} onChangeText={set("contactPhone")} keyboardType="phone-pad" />
          </FormSection>
          <FormSection title="What you need">
            <View>
              <SwitchRow label="Flights" value={f.flightsRequired} onChange={set("flightsRequired")} />
              <SwitchRow label="Hotels" value={f.hotelsRequired} onChange={set("hotelsRequired")} />
              <SwitchRow label="Airport transfers" value={f.transfersRequired} onChange={set("transfersRequired")} />
              <SwitchRow label="Meeting space" value={f.meetingSpaceRequired} onChange={set("meetingSpaceRequired")} />
              <SwitchRow label="Catering" value={f.cateringRequired} onChange={set("cateringRequired")} />
              <SwitchRow label="Visa assistance" value={f.visaAssistanceRequired} onChange={set("visaAssistanceRequired")} />
            </View>
            <TextField label="Notes (optional)" value={f.notes} onChangeText={set("notes")} multiline maxLength={4000} />
          </FormSection>
          {msg ? <Notice tone={msg.tone} message={msg.text} /> : null}
          <Button label="Send enquiry" onPress={submit} loading={isLoading} />
        </Card>
      ) : (
        <CtaCard
          icon="sparkles"
          title="Plan an event with us"
          body="Tell our events desk what you need — venues, flights, hotels and more."
          onPress={() => {
            setMsg(null);
            setOpen(true);
          }}
        />
      )}
      {!open && msg ? <Notice tone={msg.tone} message={msg.text} /> : null}

      <SectionLabel>Your enquiries</SectionLabel>
      {items.length ? (
        <Card>
          {items.map((e, i) => (
            <Row
              key={e.id}
              last={i === items.length - 1}
              leading={<DateBlock iso={e.eventStartsAt} tint={e.status === "CANCELLED" ? "slate" : "violet"} />}
              title={e.name}
              detail={[e.destination, MICE_TYPE_LABELS[e.type], `${e.attendeeCount} attendees`].join(" · ")}
              tag={requestTag(e.status)}
              actionLabel={e.status === "CANCELLED" ? undefined : "Cancel"}
              onAction={
                e.status === "CANCELLED"
                  ? undefined
                  : async () => {
                      if (await confirmAction("Cancel enquiry?", e.name, "Cancel enquiry")) cancel({ id: e.id });
                    }
              }
            />
          ))}
        </Card>
      ) : (
        <EmptyState icon="document-text-outline" tint="violet" title="No enquiries yet" body="Enquiries you send appear here with their status." />
      )}
    </>
  );
}

function EventsTab() {
  const { data: events = [] } = useMiceEventsQuery();
  const [create, { isLoading }] = useCreateMiceEventMutation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<MiceEventType>("MEETING");
  const [starts, setStarts] = useState("");
  const [ends, setEnds] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [now] = useState(() => Date.now());
  const sorted = [...events].sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  return (
    <>
      {open ? (
        <Card icon="add-circle-outline" tint="violet" title="Create an event workspace" subtitle="Delegates and agenda in one place" right={<HeaderToggle open label="Create" onPress={() => setOpen(false)} />}>
          <TextField label="Event name" value={name} onChangeText={setName} maxLength={200} />
          <ChoiceRow label="Type" options={TYPES.map((t) => ({ value: t, label: MICE_TYPE_LABELS[t] }))} value={kind} onChange={setKind} />
          <View style={styles.row}>
            <View style={styles.flex}>
              <DateField label="Starts" value={starts} onChange={setStarts} minimumDate={new Date()} />
            </View>
            <View style={styles.flex}>
              <DateField label="Ends" value={ends} onChange={setEnds} minimumDate={new Date()} />
            </View>
          </View>
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
                setOpen(false);
                router.push({ pathname: "/mice/[eventId]", params: { eventId: e.id } });
              } catch (err) {
                setMsg(formatApiError(err));
              }
            }}
          />
        </Card>
      ) : (
        <CtaCard icon="add" title="Create an event workspace" body="Run your own event: add delegates and build the agenda." onPress={() => setOpen(true)} />
      )}

      <SectionLabel>Your events</SectionLabel>
      {sorted.length ? (
        <Card>
          {sorted.map((e, i) => {
            const past = new Date(e.endsAt).getTime() < now;
            const manager = e.myRole === "MANAGER";
            return (
              <Row
                key={e.id}
                last={i === sorted.length - 1}
                leading={<DateBlock iso={e.startsAt} tint={past ? "slate" : "violet"} />}
                title={e.name}
                detail={[e.venue, MICE_TYPE_LABELS[e.type], dateRange(e.startsAt, e.endsAt)].filter(Boolean).join(" · ")}
                tag={past ? { label: "Past", tint: "slate" } : e.myRole ? { label: manager ? "Manager" : "Delegate", tint: manager ? "violet" : "blue" } : null}
                onPress={() => router.push({ pathname: "/mice/[eventId]", params: { eventId: e.id } })}
              />
            );
          })}
        </Card>
      ) : (
        <EmptyState icon="calendar-outline" tint="violet" title="No event workspaces yet" body="Create one above, or ask an organiser to add you as a delegate." />
      )}
    </>
  );
}

function CtaCard({ icon, title, body, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={({ pressed }) => [styles.cta, pressed && styles.pressed]}>
      <View style={styles.ctaIcon}>
        <Ionicons name={icon} size={22} color={colors.onBtn} />
      </View>
      <View style={styles.flexText}>
        <Text style={styles.ctaTitle}>{title}</Text>
        <Text style={styles.ctaBody}>{body}</Text>
      </View>
      <Ionicons name="arrow-forward" size={20} color={colors.onBtn} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space.sm },
  flex: { flex: 1 },
  flexText: { flex: 1, gap: 2 },
  pressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: TINT.violet.fg,
    borderRadius: radius.md + 4,
    padding: space.lg,
    ...shadow,
    shadowOpacity: 0.12,
  },
  ctaIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  ctaTitle: { fontFamily: fonts.displaySemi, fontSize: 16, color: colors.onBtn },
  ctaBody: { ...type.bodySoft, fontSize: 13, lineHeight: 18, color: "rgba(255,255,255,0.85)" },
});
