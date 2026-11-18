import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, fonts, radius, shadow, space } from "@/core/theme/tokens";
import type { JourneyWatch } from "../api/types";
import { journeyHeadline, journeyTag } from "../lib/journeySteps";
import { countdownLabel, shortDay, tripDay } from "../lib/tripList";
import { openTrip, tripEndpoints } from "./TripRow";

/**
 * The trip that matters most right now, shown big at the top of Trips.
 * With `asHeader` it's the (non-tappable) summary at the top of a trip's own page.
 */
export function NextTripCard({ watch, today, asHeader = false }: { watch: JourneyWatch; today: string; asHeader?: boolean }) {
  const head = journeyHeadline(watch);
  const day = tripDay(watch);
  const ends = head.isStay ? null : tripEndpoints(watch);
  const travelling = watch.phase === "IN_PROGRESS";
  const upcoming = watch.phase === "UPCOMING" || travelling;
  const when = travelling ? "Travelling now" : upcoming ? countdownLabel(day, today) : null;
  const eyebrow = asHeader ? journeyTag(watch.phase, watch.status).label : travelling ? "Current trip" : "Up next";
  const live = watch.liveFlight?.confirmed ? watch.liveFlight.snapshot : null;
  const liveLine = live
    ? [live.status, live.terminal ? `Terminal ${live.terminal}` : null, live.gate ? `Gate ${live.gate}` : null]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <Pressable
      accessibilityRole={asHeader ? "summary" : "button"}
      accessibilityLabel={`${eyebrow}: ${head.route}${when ? `, ${when}` : ""}${asHeader ? "" : ". Open details."}`}
      disabled={asHeader}
      onPress={() => openTrip(watch)}
      style={({ pressed }) => [styles.card, pressed && !asHeader && styles.pressed]}
    >
      <View style={styles.top}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        {when ? (
          <View style={styles.when}>
            <Ionicons name="time-outline" size={12} color={colors.night} />
            <Text style={styles.whenText}>{when}</Text>
          </View>
        ) : null}
      </View>

      {ends ? (
        <View style={styles.route}>
          <Text style={styles.code}>{ends.from}</Text>
          <View style={styles.path}>
            <View style={styles.dash} />
            <Ionicons name="airplane" size={18} color="#7fd3f7" />
            <View style={styles.dash} />
          </View>
          <Text style={styles.code}>{ends.to}</Text>
        </View>
      ) : (
        <View style={styles.stay}>
          <Ionicons name={head.isStay ? "bed" : "airplane"} size={22} color="#7fd3f7" />
          <Text style={styles.stayName} numberOfLines={2}>{head.route}</Text>
        </View>
      )}

      <View style={styles.bottom}>
        <View style={styles.flex}>
          {day ? <Text style={styles.date}>{shortDay(day)}</Text> : null}
          {head.sub ? <Text style={styles.sub} numberOfLines={1}>{head.sub}</Text> : null}
          {liveLine ? <Text style={styles.live} numberOfLines={1}>{liveLine}</Text> : null}
        </View>
        {asHeader ? null : (
          <View style={styles.go}>
            <Ionicons name="arrow-forward" size={18} color={colors.night} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.night,
    borderRadius: radius.md + 10,
    padding: space.lg,
    gap: space.lg,
    ...shadow,
    shadowOpacity: 0.22,
  },
  pressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  flex: { flex: 1, gap: 2 },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eyebrow: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", color: "#7fd3f7" },
  when: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#7fd3f7", borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 4 },
  whenText: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.night },
  route: { flexDirection: "row", alignItems: "center", gap: space.md },
  code: { fontFamily: fonts.display, fontSize: 34, color: "#fff", letterSpacing: 1 },
  path: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  dash: { flex: 1, height: 0, borderTopWidth: 1.5, borderStyle: "dashed", borderColor: "rgba(255,255,255,0.35)" },
  stay: { flexDirection: "row", alignItems: "center", gap: space.md },
  stayName: { flex: 1, fontFamily: fonts.display, fontSize: 22, color: "#fff" },
  bottom: { flexDirection: "row", alignItems: "flex-end", gap: space.md },
  date: { fontFamily: fonts.bodySemi, fontSize: 15, color: "#fff" },
  sub: { fontFamily: fonts.body, fontSize: 13, color: "rgba(255,255,255,0.65)" },
  live: { fontFamily: fonts.bodySemi, fontSize: 13, color: "#7fd3f7" },
  go: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
});
