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

/** One compact trip line: icon, route, date · ref, status. Tap for details. */
export function TripRow({ watch, today }: { watch: JourneyWatch; today: string }) {
  const head = journeyHeadline(watch);
  const tag = journeyTag(watch.phase, watch.status);
  const day = tripDay(watch);
  const tone = TAG[tag.variant];
  const soon = watch.phase === "IN_PROGRESS" ? "Travelling now" : tag.variant === "accent" ? countdownLabel(day, today) : null;
  const meta = [shortDay(day), head.ref].filter(Boolean).join(" · ");

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${head.route}, ${meta}, ${tag.label}. Open trip details.`}
      onPress={() => openTrip(watch)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.icon, { backgroundColor: tone.bg }]}>
        <Ionicons name={head.isStay ? "bed" : "airplane"} size={18} color={tone.fg} />
      </View>
      <View style={styles.body}>
        <Text style={styles.route} numberOfLines={1}>{head.route}</Text>
        <Text style={styles.meta} numberOfLines={1}>{meta || head.sub || "Details to follow"}</Text>
      </View>
      <View style={styles.right}>
        <View style={[styles.tag, { backgroundColor: tone.bg }]}>
          <Text style={[styles.tagText, { color: tone.fg }]}>{soon ?? tag.label}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    ...shadow,
    shadowOpacity: 0.05,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, gap: 2 },
  route: { fontFamily: fonts.displaySemi, fontSize: 15, color: colors.ink },
  meta: { fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft },
  right: { flexDirection: "row", alignItems: "center", gap: 4 },
  tag: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontFamily: fonts.bodySemi, fontSize: 11 },
});
