import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, fonts, radius, shadow, space } from "@/core/theme/tokens";
import type { JourneyWatch } from "../api/types";
import { journeyHeadline, journeyTag } from "../lib/journeySteps";
import { countdownLabel, shortDay, tripDay } from "../lib/tripList";

const TAG = {
  accent: { fg: colors.accent, bg: colors.accentSoft },
  success: { fg: colors.success, bg: colors.successSoft },
  muted: { fg: colors.inkSoft, bg: "#eef1f5" },
  warn: { fg: colors.danger, bg: colors.dangerSoft },
} as const;

export function openTrip(w: JourneyWatch) {
  router.push({ pathname: "/trip/[id]", params: { id: w.id } });
}

/** Flight endpoints for display: first origin and final destination codes. */
export function tripEndpoints(w: JourneyWatch): { from: string; to: string } | null {
  const flights = (w.itinerary ?? []).filter((i) => i.kind === "FLIGHT");
  const first = flights[0];
  if (!first?.origin) return null;
  const roundTrip = w.summary?.tripType === "round_trip";
  const to = roundTrip ? first.destination : flights[flights.length - 1]?.destination;
  return to ? { from: first.origin, to } : null;
}

/** "WED" / "2" / "DEC" for the calendar block. */
function dateParts(day: string | null) {
  if (!day) return null;
  const d = new Date(`${day}T00:00:00Z`);
  return {
    dow: d.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" }).toUpperCase(),
    num: String(d.getUTCDate()),
    mon: d.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }).toUpperCase(),
  };
}

/** One trip: a calendar date block, route, airline/hotel · ref, and a countdown or status chip. Tap for details. */
export function TripRow({ watch, today }: { watch: JourneyWatch; today: string }) {
  const head = journeyHeadline(watch);
  const tag = journeyTag(watch.phase, watch.status);
  const day = tripDay(watch);
  const parts = dateParts(day);
  const tone = TAG[tag.variant];
  const soon = watch.phase === "IN_PROGRESS" ? "Travelling now" : tag.variant === "accent" ? countdownLabel(day, today) : null;
  const sub = [head.sub.split(" · Booking")[0], head.ref].filter(Boolean).join(" · ");

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${head.route}, ${shortDay(day) ?? ""}, ${sub}, ${soon ?? tag.label}. Open trip details.`}
      onPress={() => openTrip(watch)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.cal, { borderColor: tone.bg }]}>
        <View style={[styles.calTop, { backgroundColor: tone.fg }]}>
          <Text style={styles.calMon}>{parts?.mon ?? "TBC"}</Text>
        </View>
        <Text style={styles.calNum}>{parts?.num ?? "–"}</Text>
        <Text style={styles.calDow}>{parts?.dow ?? ""}</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.routeRow}>
          <Ionicons name={head.isStay ? "bed" : "airplane"} size={13} color={colors.inkFaint} />
          <Text style={styles.route} numberOfLines={1}>
            {head.route}
          </Text>
        </View>
        {sub ? (
          <Text style={styles.meta} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
        <View style={[styles.tag, { backgroundColor: tone.bg }]}>
          <Text style={[styles.tagText, { color: tone.fg }]}>{soon ?? tag.label}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={17} color={colors.inkFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.card,
    borderRadius: radius.md + 4,
    padding: space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    ...shadow,
    shadowOpacity: 0.05,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  cal: { width: 54, borderRadius: 12, borderWidth: 1, overflow: "hidden", alignItems: "center", backgroundColor: colors.card },
  calTop: { alignSelf: "stretch", alignItems: "center", paddingVertical: 2 },
  calMon: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1, color: "#fff" },
  calNum: { fontFamily: fonts.display, fontSize: 20, lineHeight: 24, color: colors.ink, marginTop: 2 },
  calDow: { fontFamily: fonts.bodySemi, fontSize: 9, letterSpacing: 0.8, color: colors.inkFaint, marginBottom: 4 },
  body: { flex: 1, gap: 3 },
  routeRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  route: { flex: 1, fontFamily: fonts.displaySemi, fontSize: 16, color: colors.ink },
  meta: { fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft },
  tag: { alignSelf: "flex-start", borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3, marginTop: 2 },
  tagText: { fontFamily: fonts.bodySemi, fontSize: 11 },
});
