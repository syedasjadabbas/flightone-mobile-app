import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Button, Card, ListRow, Notice, Screen, TINT, TextField } from "@/core/components";
import { formatApiError } from "@/core/api/formatApiError";
import { colors, fonts, radius, space, type } from "@/core/theme/tokens";
import { useMyEscalationQuery } from "../api/escalationsApi";
import { Bubble, Timeline, TintTag, statusTint, triggerIcon } from "../components/SupportParts";
import { escalationStatusLabel, triggerLabel } from "../lib/caseContent";
import { customerRoutingStatusMessage } from "../lib/routingDisplay";

const STEPS = [
  { status: "OPEN", label: "Queued" },
  { status: "ASSIGNED", label: "Assigned" },
  { status: "IN_PROGRESS", label: "In progress" },
  { status: "RESOLVED", label: "Resolved" },
];

function timeOf(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function SupportCaseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: c, isLoading, error, refetch } = useMyEscalationQuery(id, { skip: !id });
  const [followUp, setFollowUp] = useState("");

  if (isLoading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.accent} />
      </Screen>
    );
  }
  if (error || !c) {
    const notFound = (error as { status?: number })?.status === 404;
    return (
      <Screen>
        <Notice message={notFound ? "Case not found." : formatApiError(error, "Case unavailable.")} />
        {!notFound ? <Button label="Retry" variant="ghost" onPress={() => refetch()} /> : null}
      </Screen>
    );
  }

  const stepIndex = STEPS.findIndex((s) => s.status === c.status);
  const messages = c.contextSnapshot?.messages ?? [];
  const ref = c.id.slice(-8).toUpperCase();
  const tint = statusTint(c.status);
  const t = TINT[tint];

  const events = [
    { key: "opened", title: "Case opened", when: new Date(c.createdAt).toLocaleString(), tint: "blue" as const },
    ...(c.updatedAt !== c.createdAt && c.updatedAt !== c.resolvedAt
      ? [{ key: "updated", title: "Last update", when: new Date(c.updatedAt).toLocaleString(), tint: "slate" as const }]
      : []),
    ...(c.resolvedAt ? [{ key: "resolved", title: "Resolved", when: new Date(c.resolvedAt).toLocaleString(), tint: "green" as const }] : []),
  ];

  return (
    <Screen edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: `Case #${ref}` }} />

      <Card>
        <View style={styles.topRow}>
          <TintTag label={escalationStatusLabel(c.status)} tint={tint} />
          <Text style={styles.ref}>#{ref}</Text>
        </View>
        <View style={styles.titleRow}>
          <View style={[styles.icon, { backgroundColor: t.bg }]}>
            <Ionicons name={triggerIcon(c.trigger)} size={20} color={t.fg} />
          </View>
          <Text style={[type.h2, styles.flex]}>{triggerLabel(c.trigger)}</Text>
        </View>
        {c.status !== "CANCELLED" ? (
          <View style={styles.steps} accessibilityLabel={`Progress: ${STEPS[stepIndex]?.label ?? escalationStatusLabel(c.status)}`}>
            {STEPS.map((s, i) => {
              const done = i < stepIndex || c.status === "RESOLVED";
              const current = i === stepIndex && c.status !== "RESOLVED";
              return (
                <View key={s.status} style={styles.step}>
                  <View style={[styles.bar, done && styles.barDone, current && styles.barOn]} />
                  <Text style={[styles.stepLabel, (done || current) && styles.stepOn]} numberOfLines={1}>
                    {s.label}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : null}
        {c.status === "RESOLVED" || c.status === "CANCELLED" ? null : (
          <View style={styles.infoRow}>
            <Ionicons name="information-circle-outline" size={16} color={colors.inkSoft} style={styles.infoIcon} />
            <Text style={[type.bodySoft, styles.flex]}>
              {customerRoutingStatusMessage({ status: c.status, assignedToUserId: c.assignedToUserId, routing: c.routing })}
            </Text>
          </View>
        )}
        {c.resolutionNote ? <Notice tone="success" message={c.resolutionNote} /> : null}
      </Card>

      <Card title="Conversation at handoff" subtitle={messages.length ? `${messages.length} messages shared with the consultant` : undefined} icon="chatbubbles-outline" tint="blue">
        {messages.length ? (
          <View style={styles.chat}>
            {messages.map((m) => (
              <Bubble key={m.id} mine={m.role === "user"} author={m.role === "user" ? "You" : "Ava"} text={m.content} time={timeOf(m.createdAt)} />
            ))}
          </View>
        ) : (
          <Text style={type.bodySoft}>No messages captured.</Text>
        )}
      </Card>

      <Card title="Activity" icon="time-outline" tint="slate">
        <Timeline items={events} />
        {c.bookingId ? (
          <ListRow
            icon="airplane-outline"
            tint="blue"
            title="Open booking"
            detail="See the trip this case is about"
            onPress={() => router.push({ pathname: "/checkout/[bookingId]", params: { bookingId: c.bookingId! } })}
            last
          />
        ) : null}
      </Card>

      <Card title="Follow up with Ava" subtitle="Ava picks up with this case's context." icon="sparkles-outline" tint="violet">
        <View style={styles.composer}>
          <View style={styles.flex}>
            <TextField
              label="Message"
              value={followUp}
              onChangeText={setFollowUp}
              multiline
              placeholder="Add a detail or ask for an update…"
              style={styles.input}
            />
          </View>
        </View>
        <Button
          label="Send to Ava"
          disabled={!followUp.trim()}
          onPress={() => router.navigate({ pathname: "/ava", params: { q: `About support case ${ref}: ${followUp.trim()}` } })}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  ref: { fontFamily: fonts.bodySemi, fontSize: 13, letterSpacing: 0.6, color: colors.inkFaint },
  titleRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  icon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  steps: { flexDirection: "row", gap: space.xs },
  step: { flex: 1, gap: 4 },
  bar: { height: 4, borderRadius: 2, backgroundColor: colors.bgGlow },
  barDone: { backgroundColor: colors.success },
  barOn: { backgroundColor: colors.accent },
  stepLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.inkFaint },
  stepOn: { fontFamily: fonts.bodyMedium, color: colors.ink },
  infoRow: { flexDirection: "row", gap: space.sm, backgroundColor: colors.bg, borderRadius: radius.sm, padding: space.md },
  infoIcon: { marginTop: 2 },
  chat: { gap: space.md },
  composer: { flexDirection: "row" },
  input: { minHeight: 80, textAlignVertical: "top", paddingTop: space.md },
});
