import { useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { Stack, router } from "expo-router";
import { Button, Card, ListRow, Notice, Pill, Screen, TextField } from "@/core/components";
import { formatApiError } from "@/core/api/formatApiError";
import { useAuthStore } from "@/core/auth/auth.store";
import { confirmAction } from "@/core/lib/confirm";
import { colors, space, type } from "@/core/theme/tokens";
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
  const [respond] = useRespondInvitationMutation();
  const invites = groups.filter((g) => g.myStatus === "INVITED");

  return (
    <Screen edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: "Group travel" }} />
      {invites.map((g) => (
        <Card key={g.id}>
          <Text style={type.h3}>You're invited to {g.name}</Text>
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
      <View style={styles.row}>
        <Pill label="Group request" selected={tab === "request"} onPress={() => setTab("request")} />
        <Pill label="Trip groups" selected={tab === "groups"} onPress={() => setTab("groups")} />
      </View>
      {tab === "request" ? <RequestTab /> : <GroupsTab />}
    </Screen>
  );
}

function RequestTab() {
  const user = useAuthStore((s) => s.user);
  const { data } = useGroupRequestsQuery();
  const [create, { isLoading }] = useCreateGroupRequestMutation();
  const [cancel] = useCancelGroupRequestMutation();
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
    } catch (err) {
      setMsg({ tone: "error", text: formatApiError(err) });
    }
  };

  const toggle = (label: string, key: "seatingTogether" | "baggageRequired" | "airportTransfers" | "accommodationRequired") => (
    <View style={styles.toggle}>
      <Text style={type.body}>{label}</Text>
      <Switch value={f[key]} onValueChange={set(key)} trackColor={{ true: colors.accent }} accessibilityLabel={label} />
    </View>
  );

  return (
    <>
      <Card>
        <Text style={type.h3}>Request a group quote</Text>
        <Text style={type.bodySoft}>For {MIN_GROUP_PASSENGERS} or more travellers. Our group desk prices it manually.</Text>
        <TextField label="Trip name" value={f.name} onChangeText={set("name")} maxLength={200} />
        <ChoiceRow label="Type" options={TYPES.map((t) => ({ value: t, label: GROUP_TYPE_LABELS[t] }))} value={f.type} onChange={set("type")} />
        <View style={styles.row}>
          <View style={styles.flex}>
            <TextField label="From" value={f.origin} onChangeText={(t) => set("origin")(t.toUpperCase())} autoCapitalize="characters" maxLength={10} />
          </View>
          <View style={styles.flex}>
            <TextField label="To" value={f.destination} onChangeText={(t) => set("destination")(t.toUpperCase())} autoCapitalize="characters" maxLength={10} />
          </View>
        </View>
        <TextField label="Departure (optional)" hint="YYYY-MM-DD" value={f.departureDate} onChangeText={set("departureDate")} maxLength={10} />
        <TextField label="Return (optional)" hint="YYYY-MM-DD" value={f.returnDate} onChangeText={set("returnDate")} maxLength={10} />
        <ChoiceRow
          label="Date flexibility"
          options={(Object.keys(FLEXIBILITY_LABELS) as GroupDateFlexibility[]).map((k) => ({ value: k, label: FLEXIBILITY_LABELS[k] }))}
          value={f.flexibility}
          onChange={set("flexibility")}
        />
        <TextField label="Travellers" value={f.passengers} onChangeText={set("passengers")} keyboardType="number-pad" />
        <TextField label="Contact name" value={f.contactName} onChangeText={set("contactName")} />
        <TextField label="Contact email" value={f.contactEmail} onChangeText={set("contactEmail")} keyboardType="email-address" autoCapitalize="none" />
        <TextField label="Contact phone (optional)" value={f.contactPhone} onChangeText={set("contactPhone")} keyboardType="phone-pad" />
        <TextField label="Organisation (optional)" value={f.organization} onChangeText={set("organization")} />
        {toggle("Seat the group together", "seatingTogether")}
        {toggle("Checked baggage", "baggageRequired")}
        {toggle("Airport transfers", "airportTransfers")}
        {toggle("Hotel rooms", "accommodationRequired")}
        <TextField label="Notes (optional)" value={f.notes} onChangeText={set("notes")} multiline maxLength={4000} />
        {msg ? <Notice tone={msg.tone} message={msg.text} /> : null}
        <Button label="Send request" onPress={submit} loading={isLoading} />
      </Card>
      <Card>
        <Text style={type.h3}>Your requests</Text>
        {data?.items.length ? (
          data.items.map((r) => (
            <ListRow
              key={r.id}
              title={`${r.name} · ${r.origin} → ${r.destination}`}
              detail={`${r.passengerCount} travellers · ${r.status.toLowerCase().replace("_", " ")}${r.departureDate ? ` · ${r.departureDate.slice(0, 10)}` : ""}`}
              actionLabel={r.status === "CANCELLED" ? undefined : "Cancel"}
              onAction={
                r.status === "CANCELLED"
                  ? undefined
                  : async () => {
                      if (await confirmAction("Cancel request?", r.name, "Cancel request")) cancel({ id: r.id });
                    }
              }
            />
          ))
        ) : (
          <Text style={type.bodySoft}>No requests yet.</Text>
        )}
      </Card>
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
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const active = groups.filter((g) => g.myStatus !== "INVITED");

  return (
    <>
      <Card>
        <Text style={type.h3}>Your trip groups</Text>
        {active.length ? (
          active.map((g) => (
            <ListRow
              key={g.id}
              title={g.name}
              detail={`${GROUP_TYPE_LABELS[g.type] ?? g.type}${g.myRole ? ` · ${g.myRole.toLowerCase()}` : ""}`}
              actionLabel="Open"
              tone="accent"
              onAction={() => router.push({ pathname: "/groups/[groupId]", params: { groupId: g.id } })}
            />
          ))
        ) : (
          <Text style={type.bodySoft}>No trip groups yet. Create one or join with an invite code.</Text>
        )}
      </Card>
      {msg ? <Notice tone={msg.tone} message={msg.text} /> : null}
      <Card>
        <Text style={type.h3}>Create a group</Text>
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
              router.push({ pathname: "/groups/[groupId]", params: { groupId: g.id } });
            } catch (err) {
              setMsg({ tone: "error", text: formatApiError(err) });
            }
          }}
        />
      </Card>
      <Card>
        <Text style={type.h3}>Join with an invite code</Text>
        <TextField label="Invite code" value={code} onChangeText={(t) => setCode(t.toUpperCase())} autoCapitalize="characters" maxLength={64} />
        <Button
          label="Join group"
          variant="ghost"
          loading={joinState.isLoading}
          disabled={!code.trim()}
          onPress={async () => {
            try {
              await join({ inviteCode: code.trim() }).unwrap();
              setCode("");
              setMsg({ tone: "success", text: "You've joined the group." });
            } catch (err) {
              setMsg({ tone: "error", text: formatApiError(err) });
            }
          }}
        />
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  flex: { flex: 1, minWidth: 120 },
  toggle: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 44 },
});

