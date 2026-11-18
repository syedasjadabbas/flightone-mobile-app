import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Button, Card, Notice, Screen, TextField, DateField, type TintName } from "@/core/components";
import { formatApiError } from "@/core/api/formatApiError";
import { colors, fonts, radius, space, type } from "@/core/theme/tokens";
import { HeaderToggle, Initials, Row, StatusTag } from "@/features/groups/components/GroupUi";
import {
  useAddMiceDelegateMutation,
  useAddMiceSessionMutation,
  useMiceDelegatesQuery,
  useMiceEventQuery,
  useMiceSessionsQuery,
  useRegisterForEventMutation,
  type MiceSession,
} from "../api/miceApi";
import { DateBlock, dateRange } from "../components/DateBlock";
import { MICE_TYPE_LABELS } from "./MiceScreen";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const dayLabel = (iso: string) => new Date(iso).toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" });
const titleCase = (s: string) => {
  const t = s.toLowerCase().replace(/_/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/** Tag colour for a delegate's registration status. */
function statusTint(status: string): TintName {
  const s = status.toUpperCase();
  if (s.includes("CHECKED") || s.includes("CONFIRM") || s.includes("ATTEND")) return "green";
  if (s.includes("CANCEL") || s.includes("DECLIN") || s.includes("REJECT")) return "rose";
  if (s.includes("WAIT") || s.includes("PENDING") || s.includes("INVITED")) return "amber";
  if (s.includes("REGISTER")) return "violet";
  return "slate";
}

/** Event workspace: delegates and agenda. Check-in, transfers, budget and sponsors are managed on the web. */
export function MiceEventScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { data: event, isLoading, error, refetch } = useMiceEventQuery(eventId, { skip: !eventId });
  const { data: delegates = [] } = useMiceDelegatesQuery(eventId, { skip: !event });
  const { data: sessions = [] } = useMiceSessionsQuery(eventId, { skip: !event });
  const [register, registerState] = useRegisterForEventMutation();
  const [flash, setFlash] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [addDelegate, setAddDelegate] = useState(false);
  const [addSession, setAddSession] = useState(false);

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

  // Delegate counts by registration status, most common first (registered, confirmed, …).
  const byStatus = new Map<string, number>();
  for (const d of delegates) {
    const s = d.registrationStatus || "UNKNOWN";
    byStatus.set(s, (byStatus.get(s) ?? 0) + 1);
  }
  const topStatuses = [...byStatus.entries()].filter(([s]) => s !== "UNKNOWN").sort((a, b) => b[1] - a[1]).slice(0, 2);

  // Agenda grouped by day, in time order.
  const days: { key: string; label: string; items: MiceSession[] }[] = [];
  for (const s of [...sessions].sort((a, b) => a.startsAt.localeCompare(b.startsAt))) {
    const key = new Date(s.startsAt).toDateString();
    const last = days[days.length - 1];
    if (last?.key === key) last.items.push(s);
    else days.push({ key, label: dayLabel(s.startsAt), items: [s] });
  }

  const onError = (e: unknown) => setFlash({ tone: "error", text: formatApiError(e) });

  return (
    <Screen edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: event.name }} />
      <Card>
        <View style={styles.head}>
          <DateBlock iso={event.startsAt} size={56} />
          <View style={styles.flexText}>
            <View style={styles.tags}>
              <StatusTag label={MICE_TYPE_LABELS[event.type]} tint="violet" />
              <StatusTag label={manager ? "Manager" : "Delegate"} tint={manager ? "violet" : "blue"} />
            </View>
            <Text style={type.h2} numberOfLines={3}>
              {event.name}
            </Text>
          </View>
        </View>
        <View style={styles.facts}>
          <Fact icon="calendar-outline" text={dateRange(event.startsAt, event.endsAt)} />
          <Fact icon="time-outline" text={`${fmt(event.startsAt)} → ${fmt(event.endsAt)}`} />
          {event.venue ? <Fact icon="location-outline" text={event.venue} /> : null}
        </View>
        <View style={styles.stats}>
          <Stat value={delegates.length} label="Delegates" />
          {topStatuses.map(([s, n]) => (
            <Stat key={s} value={n} label={titleCase(s)} divider />
          ))}
          {topStatuses.length < 2 ? <Stat value={sessions.length} label="Sessions" divider /> : null}
        </View>
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

      <Card
        title={`Delegates (${delegates.length})`}
        icon="people-outline"
        tint="violet"
        right={manager ? <HeaderToggle open={addDelegate} label="Add" icon="person-add-outline" onPress={() => setAddDelegate((v) => !v)} /> : undefined}
      >
        {manager && addDelegate ? <AddDelegate eventId={event.id} onError={onError} onDone={() => setAddDelegate(false)} /> : null}
        {delegates.length ? (
          <View>
            {delegates.map((d, i) => (
              <Row
                key={d.id}
                last={i === delegates.length - 1}
                leading={<Initials name={d.fullName} tint="violet" />}
                title={d.fullName}
                detail={d.email}
                tag={d.registrationStatus ? { label: titleCase(d.registrationStatus), tint: statusTint(d.registrationStatus) } : null}
              />
            ))}
          </View>
        ) : (
          <Text style={type.bodySoft}>No delegates yet.</Text>
        )}
      </Card>

      <Card
        title="Agenda"
        subtitle={sessions.length ? `${sessions.length} ${sessions.length === 1 ? "session" : "sessions"}` : undefined}
        icon="list-outline"
        tint="blue"
        right={manager ? <HeaderToggle open={addSession} label="Add" onPress={() => setAddSession((v) => !v)} /> : undefined}
      >
        {manager && addSession ? <AddSession eventId={event.id} onError={onError} onDone={() => setAddSession(false)} /> : null}
        {days.length ? (
          days.map((day) => (
            <View key={day.key} style={styles.day}>
              <Text style={styles.dayLabel}>{day.label}</Text>
              {day.items.map((s) => (
                <View key={s.id} style={styles.session}>
                  <View style={styles.timeCol}>
                    <Text style={styles.timeStart}>{time(s.startsAt)}</Text>
                    <Text style={styles.timeEnd}>{time(s.endsAt)}</Text>
                  </View>
                  <View style={styles.sessionBody}>
                    <Text style={styles.sessionTitle}>{s.title}</Text>
                    {s.location || s.speakers ? (
                      <Text style={styles.sessionMeta}>{[s.location, s.speakers].filter(Boolean).join(" · ")}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          ))
        ) : (
          <Text style={type.bodySoft}>No sessions yet.</Text>
        )}
      </Card>

      {manager ? (
        <Notice tone="info" message="Badge check-in, transfers, budget, sponsors and the event report are managed on the FlightOne website." />
      ) : null}
    </Screen>
  );
}

function Fact({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.fact}>
      <Ionicons name={icon} size={16} color={colors.inkSoft} />
      <Text style={styles.factText}>{text}</Text>
    </View>
  );
}

function Stat({ value, label, divider = false }: { value: number; label: string; divider?: boolean }) {
  return (
    <View style={[styles.stat, divider && styles.statDivider]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function AddDelegate({ eventId, onError, onDone }: { eventId: string; onError: (e: unknown) => void; onDone: () => void }) {
  const [add, { isLoading }] = useAddMiceDelegateMutation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  return (
    <View style={styles.form}>
      <TextField label="Delegate name" value={name} onChangeText={setName} maxLength={200} />
      <TextField label="Delegate email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <Button
        label="Add delegate"
        loading={isLoading}
        disabled={!name.trim() || !email.trim()}
        onPress={async () => {
          try {
            await add({ id: eventId, fullName: name.trim(), email: email.trim() }).unwrap();
            setName("");
            setEmail("");
            onDone();
          } catch (err) {
            onError(err);
          }
        }}
      />
    </View>
  );
}

function AddSession({ eventId, onError, onDone }: { eventId: string; onError: (e: unknown) => void; onDone: () => void }) {
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
            onDone();
          } catch (err) {
            onError(err);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: space.md },
  flexText: { flex: 1, gap: space.xs },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  facts: { gap: 6 },
  fact: { flexDirection: "row", alignItems: "center", gap: space.sm },
  factText: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.ink },
  stats: { flexDirection: "row", backgroundColor: colors.bg, borderRadius: radius.md, paddingVertical: space.md },
  stat: { flex: 1, alignItems: "center", gap: 2, paddingHorizontal: space.xs },
  statDivider: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.line },
  statValue: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  statLabel: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.inkSoft },
  form: { gap: space.md, paddingBottom: space.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  row: { flexDirection: "row", gap: space.sm },
  flex: { flex: 1 },
  day: { gap: space.sm },
  dayLabel: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: colors.inkFaint },
  session: { flexDirection: "row", gap: space.md, paddingVertical: space.xs },
  timeCol: { width: 56, alignItems: "flex-end", paddingTop: 1 },
  timeStart: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.ink },
  timeEnd: { fontFamily: fonts.body, fontSize: 12, color: colors.inkFaint },
  sessionBody: { flex: 1, gap: 2, borderLeftWidth: 2, borderLeftColor: colors.accentSoft, paddingLeft: space.md },
  sessionTitle: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.ink },
  sessionMeta: { fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft },
});
