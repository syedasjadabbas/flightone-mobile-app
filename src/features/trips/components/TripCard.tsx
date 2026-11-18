import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Button, Card, Notice, Tag } from "@/core/components";
import { formatApiError } from "@/core/api/formatApiError";
import { colors, fonts, space, type } from "@/core/theme/tokens";
import { formatMinor } from "@/features/checkout/lib/checkoutDisplay";
import { usePollJourneyMutation } from "../api/journeyApi";
import type { JourneyWatch } from "../api/types";
import { buildJourneySteps, journeyHeadline, journeyTag, type JourneyStep } from "../lib/journeySteps";

const TAG_TONE = { accent: "accent", success: "success", muted: "neutral", warn: "accent" } as const;
const STEP_PREVIEW = 3;

function bookingIdFromHref(href: string | undefined): string | null {
  const m = href ? /^\/checkout\/([^/?#]+)/.exec(href) : null;
  return m ? m[1] : null;
}

function StepRow({ step }: { step: JourneyStep }) {
  const ticketId = bookingIdFromHref(step.href);
  return (
    <View style={styles.step}>
      <View style={[styles.dot, step.done && styles.dotDone, step.next && styles.dotNext, step.tone === "critical" && styles.dotCritical]} />
      <View style={styles.stepText}>
        <Text style={[type.label, step.done && styles.doneText]}>{step.title}</Text>
        {step.when ? <Text style={type.bodySoft}>{step.when}</Text> : null}
        {step.note ? <Text style={type.bodySoft}>{step.note}</Text> : null}
        {ticketId ? (
          <Pressable
            accessibilityRole="link"
            hitSlop={8}
            onPress={() => router.push({ pathname: "/checkout/[bookingId]", params: { bookingId: ticketId } })}
          >
            <Text style={styles.link}>View ticket</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/**
 * One trip: headline, phase, timeline (same steps as the web's JourneyCard), live status refresh.
 * `detailed` (the trip's own page): the summary card above already shows the headline, so this
 * starts at the full timeline.
 */
export function TripCard({ watch, detailed = false }: { watch: JourneyWatch; detailed?: boolean }) {
  const [expanded, setExpanded] = useState(detailed);
  const [poll, pollState] = usePollJourneyMutation();
  const [note, setNote] = useState<{ tone: "info" | "error"; text: string } | null>(null);

  const head = journeyHeadline(watch);
  const tag = journeyTag(watch.phase, watch.status);
  const steps = buildJourneySteps(watch);
  const nextIndex = Math.max(0, steps.findIndex((s) => s.next));
  const shown = expanded ? steps : steps.slice(nextIndex > 0 ? nextIndex - 1 : 0, (nextIndex > 0 ? nextIndex - 1 : 0) + STEP_PREVIEW);
  const s = watch.summary;
  const closed = watch.phase === "COMPLETED" || watch.phase === "CANCELLED" || watch.status === "COMPLETED";
  const canRefresh = !head.isStay && !closed;
  const live = watch.liveFlight?.snapshot;

  const refresh = async () => {
    setNote(null);
    try {
      const r = await poll(watch.id).unwrap();
      setNote(
        r.isFact
          ? { tone: "info", text: "Live status updated." }
          : { tone: "info", text: r.reason || "Live flight status isn't available for this flight yet. We'll keep checking." },
      );
    } catch (err) {
      setNote({ tone: "error", text: formatApiError(err) });
    }
  };

  return (
    <Card>
      {detailed ? (
        <View style={styles.head}>
          <Text style={type.h3}>Timeline</Text>
          {s?.amountMinor != null && s.currency ? <Text style={styles.amount}>{formatMinor(s.amountMinor, s.currency)}</Text> : null}
        </View>
      ) : (
        <>
          <View style={styles.head}>
            <Tag label={tag.label} tone={TAG_TONE[tag.variant]} />
            {s?.amountMinor != null && s.currency ? <Text style={styles.amount}>{formatMinor(s.amountMinor, s.currency)}</Text> : null}
          </View>
          <Text style={type.h2}>{head.route}</Text>
          {head.sub ? <Text style={type.bodySoft}>{head.sub}</Text> : null}
        </>
      )}

      {live && (live.status || live.gate || live.minutesDelayed) ? (
        <Text style={type.body}>
          {[live.status, live.terminal ? `Terminal ${live.terminal}` : null, live.gate ? `Gate ${live.gate}` : null, live.minutesDelayed ? `${live.minutesDelayed} min late` : null]
            .filter(Boolean)
            .join(" · ")}
        </Text>
      ) : null}

      {steps.length ? (
        <View style={styles.steps}>
          {shown.map((st) => (
            <StepRow key={st.key} step={st} />
          ))}
          {!detailed && (steps.length > shown.length || expanded) ? (
            <Pressable accessibilityRole="button" onPress={() => setExpanded((v) => !v)} hitSlop={8}>
              <Text style={styles.link}>{expanded ? "Show less" : `Show full timeline (${steps.length})`}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {note ? <Notice tone={note.tone} message={note.text} /> : null}
      {canRefresh ? <Button label="Refresh status" variant="ghost" onPress={refresh} loading={pollState.isLoading} /> : null}
      {!closed && watch.bookingId ? (
        <Pressable
          accessibilityRole="link"
          hitSlop={8}
          onPress={() => router.push({ pathname: "/refunds", params: { bookingId: watch.bookingId } })}
        >
          <Text style={styles.link}>Refunds & changes</Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  amount: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.inkSoft },
  steps: { gap: space.md, marginTop: space.xs },
  step: { flexDirection: "row", gap: space.md },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: colors.line, marginTop: 4, backgroundColor: colors.card },
  dotDone: { backgroundColor: colors.success, borderColor: colors.success },
  dotNext: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  dotCritical: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  stepText: { flex: 1, gap: 2 },
  doneText: { color: colors.inkSoft },
  link: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.accent, paddingVertical: 4 },
});
