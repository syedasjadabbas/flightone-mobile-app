import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Button, Card, Notice, Screen, Tag, TextField } from "@/core/components";
import { formatApiError } from "@/core/api/formatApiError";
import { colors, radius, space, type } from "@/core/theme/tokens";
import { useMyEscalationQuery } from "../api/escalationsApi";
import { escalationStatusLabel, triggerLabel } from "../lib/caseContent";
import { customerRoutingStatusMessage } from "../lib/routingDisplay";

const STEPS = [
  { status: "OPEN", label: "Queued" },
  { status: "ASSIGNED", label: "Assigned" },
  { status: "IN_PROGRESS", label: "In progress" },
  { status: "RESOLVED", label: "Resolved" },
];

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

  return (
    <Screen edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: `Case #${ref}` }} />
      <Card>
        <Tag label={escalationStatusLabel(c.status)} tone={c.status === "RESOLVED" ? "success" : "accent"} />
        <Text style={type.h2}>{triggerLabel(c.trigger)}</Text>
        {c.status === "RESOLVED" || c.status === "CANCELLED" ? null : (
          <Text style={type.body}>{customerRoutingStatusMessage({ status: c.status, assignedToUserId: c.assignedToUserId, routing: c.routing })}</Text>
        )}
        {c.status !== "CANCELLED" ? (
          <View style={styles.steps}>
            {STEPS.map((s, i) => (
              <View key={s.status} style={styles.step}>
                <View style={[styles.bar, i <= stepIndex && styles.barOn]} />
                <Text style={[type.bodySoft, i <= stepIndex && styles.on]}>{s.label}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {c.resolutionNote ? <Notice tone="success" message={c.resolutionNote} /> : null}
      </Card>

      <Card>
        <Text style={type.h3}>Conversation at handoff</Text>
        {messages.length ? (
          messages.map((m) => (
            <View key={m.id} style={[styles.msg, m.role === "user" ? styles.mine : styles.theirs]}>
              <Text style={type.bodySoft}>{m.role === "user" ? "You" : "Ava"}</Text>
              <Text style={type.body}>{m.content}</Text>
            </View>
          ))
        ) : (
          <Text style={type.bodySoft}>No messages captured.</Text>
        )}
      </Card>

      <Card>
        <Text style={type.h3}>Follow up with Ava</Text>
        <TextField label="Message" value={followUp} onChangeText={setFollowUp} multiline />
        <Button
          label="Send to Ava"
          disabled={!followUp.trim()}
          onPress={() => router.navigate({ pathname: "/ava", params: { q: `About support case ${ref}: ${followUp.trim()}` } })}
        />
      </Card>

      <Card>
        <Text style={type.bodySoft}>Opened {new Date(c.createdAt).toLocaleString()}</Text>
        <Text style={type.bodySoft}>Updated {new Date(c.updatedAt).toLocaleString()}</Text>
        {c.resolvedAt ? <Text style={type.bodySoft}>Resolved {new Date(c.resolvedAt).toLocaleString()}</Text> : null}
        {c.bookingId ? (
          <Button
            label="Open booking"
            variant="ghost"
            onPress={() => router.push({ pathname: "/checkout/[bookingId]", params: { bookingId: c.bookingId! } })}
          />
        ) : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  steps: { flexDirection: "row", gap: space.xs },
  step: { flex: 1, gap: 4 },
  bar: { height: 4, borderRadius: 2, backgroundColor: colors.bgGlow },
  barOn: { backgroundColor: colors.accent },
  on: { color: colors.ink },
  msg: { borderRadius: radius.sm, padding: space.md, gap: 2 },
  mine: { backgroundColor: colors.accentSoft },
  theirs: { backgroundColor: colors.bg },
});
