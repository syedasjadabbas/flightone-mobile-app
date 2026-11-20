import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { Notice } from "@/core/components";
import { formatApiError } from "@/core/api/formatApiError";
import { colors, fonts, radius, shadow, space } from "@/core/theme/tokens";
import { formatMinor } from "@/features/checkout/lib/checkoutDisplay";
import { usePollJourneyMutation } from "../api/journeyApi";
import type { JourneyWatch } from "../api/types";
import { buildJourneySteps, journeyHeadline, type JourneyStep } from "../lib/journeySteps";

type IconName = keyof typeof Ionicons.glyphMap;
const UPDATES_PREVIEW = 2;

function bookingIdFromHref(href: string | undefined): string | null {
  const m = href ? /^\/checkout\/([^/?#]+)/.exec(href) : null;
  return m ? m[1] : null;
}

/** "in 11 days" / "tomorrow" / "today" from a step instant. */
function relative(at: number, now: number): string | null {
  if (!Number.isFinite(at)) return null;
  const days = Math.round((at - now) / 86_400_000);
  if (days < 0) return null;
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days < 14) return `in ${days} days`;
  return `in ${Math.round(days / 7)} weeks`;
}

function stepIcon(s: JourneyStep): IconName {
  const t = s.title.toLowerCase();
  if (t.includes("hotel")) return "bed-outline";
  if (t.includes("check-in")) return "checkbox-outline";
  if (t.startsWith("departs") || t.includes("departs")) return "airplane-outline";
  if (t.startsWith("lands")) return "flag-outline";
  if (t.includes("hotel")) return "bed-outline";
  if (t.includes("gate")) return "git-compare-outline";
  if (t.includes("delay")) return "time-outline";
  if (t.includes("ticket")) return "ticket-outline";
  if (t.includes("connection")) return "swap-horizontal-outline";
  return "ellipse-outline";
}

function ActionButton({ icon, label, onPress, busy }: { icon: IconName; label: string; onPress: () => void; busy?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={busy}
      onPress={() => {
        void Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}
    >
      <View style={styles.actionIcon}>{busy ? <ActivityIndicator size="small" color={colors.accent} /> : <Ionicons name={icon} size={19} color={colors.accent} />}</View>
      <Text style={styles.actionText} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/** One "coming up" step on the timeline. */
function UpcomingRow({ s, first, last }: { s: JourneyStep; first: boolean; last: boolean }) {
  return (
    <View style={styles.tlRow}>
      <View style={styles.tlRail}>
        <View style={[styles.tlLine, first && styles.tlHidden]} />
        <View style={[styles.tlDot, first && styles.tlDotNext]} />
        <View style={[styles.tlLine, last && styles.tlHidden]} />
      </View>
      <View style={styles.tlBody}>
        <Text style={[styles.tlTitle, first && styles.tlTitleNext]}>{s.title}</Text>
        {s.when ? <Text style={styles.tlWhen}>{s.when}</Text> : null}
      </View>
    </View>
  );
}

/** One past update: icon, title, time, and a note that expands on tap. */
function UpdateRow({ s, last }: { s: JourneyStep; last: boolean }) {
  const [open, setOpen] = useState(false);
  const ticketId = bookingIdFromHref(s.href);
  const warn = s.tone === "attention" || s.tone === "critical";
  return (
    <Pressable
      accessibilityRole={s.note ? "button" : undefined}
      onPress={s.note ? () => setOpen((v) => !v) : undefined}
      style={[styles.update, !last && styles.divider]}
    >
      <View style={[styles.updIcon, warn && styles.updIconWarn]}>
        <Ionicons name={stepIcon(s)} size={16} color={warn ? "#b26a00" : colors.success} />
      </View>
      <View style={styles.flex}>
        <View style={styles.updHead}>
          <Text style={styles.updTitle} numberOfLines={1}>
            {s.title}
          </Text>
          {s.when ? <Text style={styles.updWhen}>{s.when.split(" · ")[0]}</Text> : null}
        </View>
        {s.note ? (
          <Text style={styles.updNote} numberOfLines={open ? undefined : 2}>
            {s.note}
          </Text>
        ) : null}
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
    </Pressable>
  );
}

/**
 * The trip's own page under the summary card: what's next, quick actions,
 * the upcoming steps, recent updates (latest first, folded), and trip details.
 */
export function TripDetailBody({ watch }: { watch: JourneyWatch }) {
  const [poll, pollState] = usePollJourneyMutation();
  const [note, setNote] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const [allUpdates, setAllUpdates] = useState(false);
  const [now] = useState(() => Date.now());

  const head = journeyHeadline(watch);
  const steps = buildJourneySteps(watch, now);
  const upcoming = steps.filter((s) => !s.done);
  const updates = steps.filter((s) => s.done).sort((a, b) => b.at - a.at);
  const next = upcoming[0];
  const closed = watch.phase === "COMPLETED" || watch.phase === "CANCELLED" || watch.status === "COMPLETED";
  const canRefresh = !head.isStay && !closed;
  const ticketStep = steps.find((s) => bookingIdFromHref(s.href));
  const ticketId = bookingIdFromHref(ticketStep?.href) ?? (watch.bookingId || null);
  const s = watch.summary;
  const shownUpdates = allUpdates ? updates : updates.slice(0, UPDATES_PREVIEW);

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
    <>
      {next ? (
        <View style={styles.next}>
          <View style={styles.nextIcon}>
            <Ionicons name={stepIcon(next)} size={20} color="#fff" />
          </View>
          <View style={styles.flex}>
            <Text style={styles.nextEyebrow}>Next{relative(next.at, now) ? ` · ${relative(next.at, now)}` : ""}</Text>
            <Text style={styles.nextTitle}>{next.title}</Text>
            {next.when ? <Text style={styles.nextWhen}>{next.when}</Text> : null}
            {next.note ? <Text style={styles.nextNote}>{next.note}</Text> : null}
          </View>
        </View>
      ) : null}

      <View style={styles.actions}>
        {ticketId ? (
          <ActionButton icon="ticket-outline" label="Ticket" onPress={() => router.push({ pathname: "/checkout/[bookingId]", params: { bookingId: ticketId } })} />
        ) : null}
        {canRefresh ? <ActionButton icon="refresh" label="Refresh status" onPress={() => void refresh()} busy={pollState.isLoading} /> : null}
        {!closed && watch.bookingId ? (
          <ActionButton icon="swap-horizontal" label="Changes" onPress={() => router.push({ pathname: "/refunds", params: { bookingId: watch.bookingId } })} />
        ) : null}
      </View>
      {note ? <Notice tone={note.tone} message={note.text} /> : null}

      {upcoming.length > 1 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Coming up</Text>
          {upcoming.slice(1).map((st, i, arr) => (
            <UpcomingRow key={st.key} s={st} first={false} last={i === arr.length - 1} />
          ))}
        </View>
      ) : null}

      {updates.length ? (
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>Updates</Text>
            <Text style={styles.count}>{updates.length}</Text>
          </View>
          {shownUpdates.map((st, i) => (
            <UpdateRow key={st.key} s={st} last={i === shownUpdates.length - 1} />
          ))}
          {updates.length > UPDATES_PREVIEW ? (
            <Pressable accessibilityRole="button" onPress={() => setAllUpdates((v) => !v)} style={styles.more} hitSlop={6}>
              <Text style={styles.link}>{allUpdates ? "Show fewer" : `Show all ${updates.length} updates`}</Text>
              <Ionicons name={allUpdates ? "chevron-up" : "chevron-down"} size={15} color={colors.accent} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Trip details</Text>
        <View style={styles.facts}>
          {head.sub ? <Fact label={head.isStay ? "Stay" : "Flight"} value={head.sub.split(" · Booking")[0]} /> : null}
          {head.ref ? <Fact label="Booking ref" value={head.ref} /> : null}
          {s?.cabin ? <Fact label="Cabin" value={s.cabin.charAt(0).toUpperCase() + s.cabin.slice(1).toLowerCase()} /> : null}
          {s?.amountMinor != null && s.currency ? <Fact label="Paid" value={formatMinor(s.amountMinor, s.currency)} /> : null}
        </View>
      </View>
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.8 },

  next: {
    flexDirection: "row",
    gap: space.md,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md + 6,
    padding: space.lg,
    borderWidth: 1,
    borderColor: "rgba(10,134,192,0.18)",
  },
  nextIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  nextEyebrow: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: colors.accent },
  nextTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.ink, marginTop: 2 },
  nextWhen: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.ink, marginTop: 2 },
  nextNote: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.inkSoft, marginTop: 4 },

  actions: { flexDirection: "row", gap: space.sm },
  action: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.card,
    borderRadius: radius.md + 2,
    paddingVertical: space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  actionIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" },
  actionText: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.ink },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md + 6,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    ...shadow,
    shadowOpacity: 0.05,
  },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: colors.inkFaint, paddingVertical: space.sm },
  count: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.inkFaint },

  tlRow: { flexDirection: "row", gap: space.md, minHeight: 52 },
  tlRail: { width: 14, alignItems: "center" },
  tlLine: { flex: 1, width: 2, backgroundColor: colors.line },
  tlHidden: { backgroundColor: "transparent" },
  tlDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: colors.inkFaint, backgroundColor: colors.card },
  tlDotNext: { borderColor: colors.accent },
  tlBody: { flex: 1, justifyContent: "center", paddingVertical: space.sm },
  tlTitle: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.ink },
  tlTitleNext: { color: colors.accent },
  tlWhen: { fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft, marginTop: 1 },

  update: { flexDirection: "row", gap: space.md, paddingVertical: space.md },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  updIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.successSoft, alignItems: "center", justifyContent: "center" },
  updIconWarn: { backgroundColor: "#fdf1dc" },
  updHead: { flexDirection: "row", alignItems: "baseline", gap: space.sm },
  updTitle: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 14, color: colors.ink },
  updWhen: { fontFamily: fonts.body, fontSize: 12, color: colors.inkFaint },
  updNote: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.inkSoft, marginTop: 2 },
  link: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.accent, paddingTop: 4 },
  more: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: space.sm },

  facts: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, paddingBottom: space.sm },
  fact: { flexBasis: "47%", flexGrow: 1, backgroundColor: colors.bg, borderRadius: radius.sm, paddingVertical: 10, paddingHorizontal: space.md, gap: 2 },
  factLabel: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase", color: colors.inkFaint },
  factValue: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.ink },
});
