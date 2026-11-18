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
import {
  useCancelGroupRequestMutation,
  useCreateGroupMutation,
  useCreateGroupRequestMutation,
  useGroupRequestsQuery,
  useGroupsQuery,
  useJoinGroupMutation,
  useRespondInvitationMutation,
  type GroupDateFlexibility,
  type GroupType,
} from "../api/groupsApi";
import { FormSection, HeaderToggle, IconBadge, Row, SwitchRow, requestTag, shortDate } from "../components/GroupUi";
import {
  FLEXIBILITY_LABELS,
  GROUP_TYPE_LABELS,
  MIN_GROUP_PASSENGERS,
  isValidGroupPassengerCount,
  newIdempotencyKey,
} from "../lib/groupLabels";

const TYPES = Object.keys(GROUP_TYPE_LABELS) as GroupType[];

/** Group travel: request quotes for 10+ travellers, and trip groups (invite, join, share). */
export function GroupsScreen() {
  const [tab, setTab] = useState<"request" | "groups">("request");
  const { data: groups = [] } = useGroupsQuery();
  const { data: requests } = useGroupRequestsQuery();
  const [respond] = useRespondInvitationMutation();
  const invites = groups.filter((g) => g.myStatus === "INVITED");
  const activeGroups = groups.length - invites.length;
  const openRequests = (requests?.items ?? []).filter((r) => r.status !== "CANCELLED").length;

  return (
    <Screen edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: "Group travel" }} />
      <PageHeader
        icon="people-outline"
        tint="teal"
        subtitle={`Quotes for ${MIN_GROUP_PASSENGERS}+ travellers, and shared trip groups for family and friends.`}
        stats={[
          { value: openRequests, label: "Open quotes" },
          { value: activeGroups, label: "Trip groups" },
          { value: invites.length, label: "Invites" },
        ]}
      />

      {invites.map((g) => (
        <Card key={g.id} icon="mail-unread-outline" tint="teal" title={`You're invited to ${g.name}`} subtitle={GROUP_TYPE_LABELS[g.type] ?? g.type}>
          <View style={styles.row}>
            <Button label="Accept" style={styles.flex} onPress={() => respond({ id: g.id, accept: true })} />
            <Button
              label="Decline"
              variant="ghost"
              style={styles.flex}
              onPress={async () => {
                if (await confirmAction("Decline invitation?", g.name, "Decline")) respond({ id: g.id, accept: false });
              }}
            />
          </View>
        </Card>
      ))}

      <Segmented
        options={[
          { value: "request", label: "Group quotes", count: openRequests },
          { value: "groups", label: "Trip groups", count: activeGroups },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "request" ? <RequestTab /> : <GroupsTab />}
    </Screen>
  );
}

function RequestTab() {
  const user = useAuthStore((s) => s.user);
  const { data } = useGroupRequestsQuery();
  const [create, { isLoading }] = useCreateGroupRequestMutation();
  const [cancel] = useCancelGroupRequestMutation();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    name: "",
    type: "LEISURE" as GroupType,
    origin: "LHE",
    destination: "",
    departureDate: "",
    returnDate: "",
    flexibility: "EXACT" as GroupDateFlexibility,
    passengers: String(MIN_GROUP_PASSENGERS),
    contactName: user?.name ?? "",
    contactEmail: user?.email ?? "",
    contactPhone: "",
    organization: "",
    seatingTogether: true,
    baggageRequired: true,
    airportTransfers: false,
    accommodationRequired: false,
    notes: "",
  });
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const set = <K extends keyof typeof f>(k: K) => (v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    setMsg(null);
    const passengers = Number(f.passengers);
    const origin = f.origin.trim().toUpperCase();
    const destination = f.destination.trim().toUpperCase();
    if (!f.name.trim()) return setMsg({ tone: "error", text: "Name your group trip." });
    if (!/^[A-Z]{2,10}$/.test(origin) || !/^[A-Z]{2,10}$/.test(destination) || origin === destination) {
      return setMsg({ tone: "error", text: "Use airport or city codes for from and to, e.g. LHE and JED." });
    }
    if (!isValidGroupPassengerCount(passengers)) {
      return setMsg({ tone: "error", text: `Group requests are for ${MIN_GROUP_PASSENGERS}–500 travellers.` });
    }
    const date = /^\d{4}-\d{2}-\d{2}$/;
    if ((f.departureDate && !date.test(f.departureDate)) || (f.returnDate && !date.test(f.returnDate))) {
      return setMsg({ tone: "error", text: "Dates look like 2027-01-15." });
    }
    if (f.returnDate && (!f.departureDate || f.returnDate < f.departureDate)) {
      return setMsg({ tone: "error", text: "Return must be after departure." });
    }
    if (!f.contactName.trim() || !/^\S+@\S+\.\S+$/.test(f.contactEmail.trim())) {
      return setMsg({ tone: "error", text: "Add a contact name and email." });
    }
    try {
      await create({
        name: f.name.trim(),
        type: f.type,
        origin,
        destination,
        ...(f.departureDate ? { departureDate: f.departureDate } : {}),
        ...(f.returnDate ? { returnDate: f.returnDate } : {}),
        flexibility: f.flexibility,
        passengerCount: passengers,
        contactName: f.contactName.trim(),
        contactEmail: f.contactEmail.trim(),
        ...(f.contactPhone.trim() ? { contactPhone: f.contactPhone.trim() } : {}),
        ...(f.organization.trim() ? { organization: f.organization.trim() } : {}),
        seatingTogether: f.seatingTogether,
        baggageRequired: f.baggageRequired,
        airportTransfers: f.airportTransfers,
        accommodationRequired: f.accommodationRequired,
        ...(f.notes.trim() ? { notes: f.notes.trim() } : {}),
        idempotencyKey: newIdempotencyKey(),
      }).unwrap();
      setMsg({ tone: "success", text: "Request sent to our group desk. A consultant will quote fares and contact you — nothing is booked yet." });
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
        <Card icon="people-outline" tint="teal" title="Request a group quote" subtitle={`${MIN_GROUP_PASSENGERS}+ travellers · priced by our group desk`} right={<HeaderToggle open label="Request" onPress={() => setOpen(false)} />}>
          <FormSection title="Trip">
            <TextField label="Trip name" placeholder="e.g. Office Umrah 2027" value={f.name} onChangeText={set("name")} maxLength={200} />
            <ChoiceRow label="Type" options={TYPES.map((t) => ({ value: t, label: GROUP_TYPE_LABELS[t] }))} value={f.type} onChange={set("type")} />
            <View style={styles.row}>
              <View style={styles.flex}>
                <TextField label="From" value={f.origin} onChangeText={(t) => set("origin")(t.toUpperCase())} autoCapitalize="characters" maxLength={10} />
              </View>
              <View style={styles.flex}>
                <TextField label="To" placeholder="JED" value={f.destination} onChangeText={(t) => set("destination")(t.toUpperCase())} autoCapitalize="characters" maxLength={10} />
              </View>
            </View>
            <TextField label="Travellers" hint={`${MIN_GROUP_PASSENGERS}–500`} value={f.passengers} onChangeText={set("passengers")} keyboardType="number-pad" />
          </FormSection>
          <FormSection title="Dates">
            <DateField label="Departure (optional)" value={f.departureDate} onChange={set("departureDate")} optional minimumDate={new Date()} />
            <DateField label="Return (optional)" value={f.returnDate} onChange={set("returnDate")} optional minimumDate={new Date()} />
            <ChoiceRow
              label="Date flexibility"
              options={(Object.keys(FLEXIBILITY_LABELS) as GroupDateFlexibility[]).map((k) => ({ value: k, label: FLEXIBILITY_LABELS[k] }))}
              value={f.flexibility}
              onChange={set("flexibility")}
            />
          </FormSection>
          <FormSection title="Contact">
            <TextField label="Contact name" value={f.contactName} onChangeText={set("contactName")} />
            <TextField label="Contact email" value={f.contactEmail} onChangeText={set("contactEmail")} keyboardType="email-address" autoCapitalize="none" />
            <TextField label="Contact phone (optional)" value={f.contactPhone} onChangeText={set("contactPhone")} keyboardType="phone-pad" />
            <TextField label="Organisation (optional)" value={f.organization} onChangeText={set("organization")} />
          </FormSection>
          <FormSection title="Extras">
            <View>
              <SwitchRow label="Seat the group together" value={f.seatingTogether} onChange={set("seatingTogether")} />
              <SwitchRow label="Checked baggage" value={f.baggageRequired} onChange={set("baggageRequired")} />
              <SwitchRow label="Airport transfers" value={f.airportTransfers} onChange={set("airportTransfers")} />
              <SwitchRow label="Hotel rooms" value={f.accommodationRequired} onChange={set("accommodationRequired")} />
            </View>
            <TextField label="Notes (optional)" value={f.notes} onChangeText={set("notes")} multiline maxLength={4000} />
          </FormSection>
          {msg ? <Notice tone={msg.tone} message={msg.text} /> : null}
          <Button label="Send request" onPress={submit} loading={isLoading} />
        </Card>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Request a group quote"
          onPress={() => {
            setMsg(null);
            setOpen(true);
          }}
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
        >
          <View style={styles.ctaIcon}>
            <Ionicons name="people" size={22} color={colors.onBtn} />
          </View>
          <View style={styles.flexText}>
            <Text style={styles.ctaTitle}>Request a group quote</Text>
            <Text style={styles.ctaBody}>For {MIN_GROUP_PASSENGERS}+ travellers. Our group desk prices it and gets back to you.</Text>
          </View>
          <Ionicons name="arrow-forward" size={20} color={colors.onBtn} />
        </Pressable>
      )}
      {!open && msg ? <Notice tone={msg.tone} message={msg.text} /> : null}

      <SectionLabel>Your requests</SectionLabel>
      {items.length ? (
        <Card>
          {items.map((r, i) => (
            <Row
              key={r.id}
              last={i === items.length - 1}
              leading={<IconBadge icon="airplane-outline" tint={r.status === "CANCELLED" ? "slate" : "teal"} />}
              title={r.name}
              detail={[`${r.origin} → ${r.destination}`, `${r.passengerCount} travellers`, r.departureDate ? shortDate(r.departureDate) : null].filter(Boolean).join(" · ")}
              tag={requestTag(r.status)}
              actionLabel={r.status === "CANCELLED" ? undefined : "Cancel"}
              onAction={
                r.status === "CANCELLED"
                  ? undefined
                  : async () => {
                      if (await confirmAction("Cancel request?", r.name, "Cancel request")) cancel({ id: r.id });
                    }
              }
            />
          ))}
        </Card>
      ) : (
        <EmptyState icon="document-text-outline" tint="teal" title="No requests yet" body="Quotes you request appear here with their status." />
      )}
    </>
  );
}

function GroupsTab() {
  const { data: groups = [] } = useGroupsQuery();
  const [create, createState] = useCreateGroupMutation();
  const [join, joinState] = useJoinGroupMutation();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<GroupType>("FAMILY");
  const [code, setCode] = useState("");
  const [form, setForm] = useState<"create" | "join" | null>(null);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const active = groups.filter((g) => g.myStatus !== "INVITED");
  const open = (id: string) => router.push({ pathname: "/groups/[groupId]", params: { groupId: id } });

  return (
    <>
      {msg ? <Notice tone={msg.tone} message={msg.text} /> : null}

      {active.length ? (
        <>
          <SectionLabel>Your trip groups</SectionLabel>
          <Card>
            {active.map((g, i) => {
              const role = g.myMembership?.role ?? g.myRole;
              const lead = role === "ORGANIZER" || role === "ADMIN";
              return (
                <Row
                  key={g.id}
                  last={i === active.length - 1}
                  leading={<IconBadge icon="people" tint="teal" />}
                  title={g.name}
                  detail={[GROUP_TYPE_LABELS[g.type] ?? g.type, `since ${shortDate(g.createdAt)}`].join(" · ")}
                  tag={role ? { label: lead ? "Organizer" : role.charAt(0) + role.slice(1).toLowerCase(), tint: lead ? "teal" : "slate" } : null}
                  onPress={() => open(g.id)}
                />
              );
            })}
          </Card>
        </>
      ) : (
        <EmptyState
          icon="people-outline"
          tint="teal"
          title="No trip groups yet"
          body="Create one to share itineraries, announcements and polls — or join with an invite code."
        />
      )}

      <SectionLabel>Start or join</SectionLabel>
      <Card
        icon="add-circle-outline"
        tint="teal"
        title="Create a group"
        subtitle="You'll be the organizer"
        right={<HeaderToggle open={form === "create"} label="Create" onPress={() => setForm(form === "create" ? null : "create")} />}
      >
        {form === "create" ? (
          <>
            <TextField label="Group name" value={name} onChangeText={setName} maxLength={200} />
            <ChoiceRow label="Type" options={TYPES.map((t) => ({ value: t, label: GROUP_TYPE_LABELS[t] }))} value={kind} onChange={setKind} />
            <Button
              label="Create group"
              loading={createState.isLoading}
              disabled={!name.trim()}
              onPress={async () => {
                try {
                  const g = await create({ name: name.trim(), type: kind }).unwrap();
                  setName("");
                  setForm(null);
                  open(g.id);
                } catch (err) {
                  setMsg({ tone: "error", text: formatApiError(err) });
                }
              }}
            />
          </>
        ) : null}
      </Card>
      <Card
        icon="key-outline"
        tint="slate"
        title="Join with an invite code"
        subtitle="Ask the organizer for the code"
        right={<HeaderToggle open={form === "join"} label="Join" icon="enter-outline" onPress={() => setForm(form === "join" ? null : "join")} />}
      >
        {form === "join" ? (
          <>
            <TextField label="Invite code" value={code} onChangeText={(t) => setCode(t.toUpperCase())} autoCapitalize="characters" maxLength={64} />
            <Button
              label="Join group"
              loading={joinState.isLoading}
              disabled={!code.trim()}
              onPress={async () => {
                try {
                  await join({ inviteCode: code.trim() }).unwrap();
                  setCode("");
                  setForm(null);
                  setMsg({ tone: "success", text: "You've joined the group." });
                } catch (err) {
                  setMsg({ tone: "error", text: formatApiError(err) });
                }
              }}
            />
          </>
        ) : null}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  flex: { flex: 1, minWidth: 120 },
  flexText: { flex: 1, gap: 2 },
  pressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: TINT.teal.fg,
    borderRadius: radius.md + 4,
    padding: space.lg,
    ...shadow,
    shadowOpacity: 0.12,
  },
  ctaIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  ctaTitle: { fontFamily: fonts.displaySemi, fontSize: 16, color: colors.onBtn },
  ctaBody: { ...type.bodySoft, fontSize: 13, lineHeight: 18, color: "rgba(255,255,255,0.85)" },
});
