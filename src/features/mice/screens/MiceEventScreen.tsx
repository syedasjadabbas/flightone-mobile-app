import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { Button, Card, ListRow, Notice, Screen, Tag, TextField, DateField } from "@/core/components";
import { formatApiError } from "@/core/api/formatApiError";
import { colors, space, type } from "@/core/theme/tokens";
import {
  useAddMiceDelegateMutation,
  useAddMiceSessionMutation,
  useMiceDelegatesQuery,
  useMiceEventQuery,
  useMiceSessionsQuery,
  useRegisterForEventMutation,
} from "../api/miceApi";
import { MICE_TYPE_LABELS } from "./MiceScreen";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** Event workspace: delegates and agenda. Check-in, transfers, budget and sponsors are managed on the web. */
export function MiceEventScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { data: event, isLoading, error, refetch } = useMiceEventQuery(eventId, { skip: !eventId });
  const { data: delegates = [] } = useMiceDelegatesQuery(eventId, { skip: !event });
  const { data: sessions = [] } = useMiceSessionsQuery(eventId, { skip: !event });
  const [register, registerState] = useRegisterForEventMutation();
  const [flash, setFlash] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  if (isLoading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.accent} />
      </Screen>
    );
  }
  if (error || !event) {
    const forbidden = (error as { status?: number })?.status === 403;
    return (
      <Screen>
        <Notice message={forbidden ? "You don't have access to this event." : formatApiError(error, "Event unavailable.")} />
        {!forbidden ? <Button label="Retry" variant="ghost" onPress={() => refetch()} /> : null}
      </Screen>
    );
  }

  const manager = event.myRole === "MANAGER";
  return (
    <Screen edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: event.name }} />
      <Card>
        <View style={styles.between}>
          <Tag label={MICE_TYPE_LABELS[event.type]} tone="accent" />
          <Tag label={manager ? "Manager" : "Delegate"} tone="neutral" />
        </View>
        <Text style={type.h2}>{event.name}</Text>
        <Text style={type.body}>
          {fmt(event.startsAt)} → {fmt(event.endsAt)}
        </Text>
        {event.venue ? <Text style={type.bodySoft}>{event.venue}</Text> : null}
        {!manager ? (
          <Button
            label="Register me"
            loading={registerState.isLoading}
            onPress={async () => {
              try {
                await register(event.id).unwrap();
                setFlash({ tone: "success", text: "You're registered." });
              } catch (err) {
                setFlash({ tone: "error", text: formatApiError(err) });
              }
            }}
          />
        ) : null}
      </Card>
      {flash ? <Notice tone={flash.tone} message={flash.text} /> : null}

      <Card>
        <Text style={type.h3}>Delegates ({delegates.length})</Text>
        {delegates.length ? (
          delegates.map((d) => <ListRow key={d.id} title={d.fullName} detail={[d.email, d.registrationStatus?.toLowerCase()].filter(Boolean).join(" · ")} />)
        ) : (
          <Text style={type.bodySoft}>No delegates yet.</Text>
        )}
        {manager ? <AddDelegate eventId={event.id} onError={(e) => setFlash({ tone: "error", text: formatApiError(e) })} /> : null}
      </Card>

      <Card>
        <Text style={type.h3}>Agenda</Text>
        {sessions.length ? (
          sessions.map((s) => (
            <ListRow key={s.id} title={s.title} detail={[`${fmt(s.startsAt)} – ${fmt(s.endsAt)}`, s.location, s.speakers].filter(Boolean).join(" · ")} />
          ))
        ) : (
          <Text style={type.bodySoft}>No sessions yet.</Text>
        )}
        {manager ? <AddSession eventId={event.id} onError={(e) => setFlash({ tone: "error", text: formatApiError(e) })} /> : null}
      </Card>

      {manager ? (
        <Notice tone="info" message="Badge check-in, transfers, budget, sponsors and the event report are managed on the FlightOne website." />
      ) : null}
    </Screen>
  );
}

function AddDelegate({ eventId, onError }: { eventId: string; onError: (e: unknown) => void }) {
  const [add, { isLoading }] = useAddMiceDelegateMutation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  return (
    <View style={styles.form}>
      <TextField label="Delegate name" value={name} onChangeText={setName} maxLength={200} />
      <TextField label="Delegate email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <Button
        label="Add delegate"
        variant="ghost"
        loading={isLoading}
        disabled={!name.trim() || !email.trim()}
        onPress={async () => {
          try {
            await add({ id: eventId, fullName: name.trim(), email: email.trim() }).unwrap();
            setName("");
            setEmail("");
          } catch (err) {
            onError(err);
          }
        }}
      />
    </View>
  );
}

function AddSession({ eventId, onError }: { eventId: string; onError: (e: unknown) => void }) {
  const [add, { isLoading }] = useAddMiceSessionMutation();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [location, setLocation] = useState("");
  return (
    <View style={styles.form}>
      <TextField label="Session title" value={title} onChangeText={setTitle} maxLength={200} />
      <DateField label="Date" value={date} onChange={setDate} minimumDate={new Date()} />
      <View style={styles.row}>
        <View style={styles.flex}>
          <DateField label="Start" value={start} onChange={setStart} mode="time" />
        </View>
        <View style={styles.flex}>
          <DateField label="End" value={end} onChange={setEnd} mode="time" />
        </View>
      </View>
      <TextField label="Location (optional)" value={location} onChangeText={setLocation} />
      <Button
        label="Add session"
        variant="ghost"
        loading={isLoading}
        onPress={async () => {
          if (!title.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end) || end <= start) {
            return onError("Add a title, a date like 2027-03-10 and times like 09:00 (end after start).");
          }
          try {
            await add({
              id: eventId,
              title: title.trim(),
              startsAt: new Date(`${date}T${start}:00`).toISOString(),
              endsAt: new Date(`${date}T${end}:00`).toISOString(),
              ...(location.trim() ? { location: location.trim() } : {}),
            }).unwrap();
            setTitle("");
          } catch (err) {
            onError(err);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  form: { gap: space.md, marginTop: space.sm },
  row: { flexDirection: "row", gap: space.sm },
  flex: { flex: 1 },
});
