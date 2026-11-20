import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, fonts, radius, shadow, space } from "@/core/theme/tokens";
import { cheapest } from "../lib/resultsFilter";
import { useResultsStore } from "../resultsStore";
import type { OfferCard, SearchResultsPanel } from "../types";

function stopsLabel(n: number) {
  return n === 0 ? "Nonstop" : n === 1 ? "1 stop" : `${n} stops`;
}

function MiniOffer({ offer, tag }: { offer: OfferCard; tag: string }) {
  const f = offer.flight;
  const h = offer.hotel;
  return (
    <View style={styles.mini}>
      <View style={styles.flex}>
        <Text style={styles.miniTag}>{tag}</Text>
        <Text style={styles.miniTitle} numberOfLines={1}>
          {f ? f.airline : h ? h.name : offer.title}
        </Text>
        <Text style={styles.miniSub} numberOfLines={1}>
          {f
            ? [f.departTimeLocal && f.arriveTimeLocal ? `${f.departTimeLocal} – ${f.arriveTimeLocal}` : f.departTimeLocal, stopsLabel(f.stops)]
                .filter(Boolean)
                .join(" · ")
            : h
              ? [`${h.stars}★`, h.area || h.city, h.breakfastIncluded ? "Breakfast" : null].filter(Boolean).join(" · ")
              : offer.subtitle}
        </Text>
      </View>
      <Text style={styles.miniPrice}>{offer.price}</Text>
    </View>
  );
}

/**
 * What a search reply shows in the chat: a compact summary and the top picks,
 * then "View results" opens the full list with sort and filters.
 */
export function ResultsSummaryCard({ id, panel }: { id: string; panel: SearchResultsPanel }) {
  const put = useResultsStore((s) => s.put);
  const offers = panel.offers ?? [];
  if (!offers.length) {
    return panel.emptyHint ? <Text style={styles.empty}>{panel.emptyHint}</Text> : null;
  }
  const total = Math.max(panel.totalCount || 0, offers.length);
  const best = offers[0];
  const low = cheapest(offers);
  const live = panel.liveFlights || panel.liveHotels;

  const open = () => {
    put(id, panel);
    router.push({ pathname: "/results/[id]", params: { id } });
  };

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.flex}>
          <Text style={styles.title} numberOfLines={1}>
            {panel.tripTitle || panel.queryLabel || panel.legRoute || "Your options"}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {[panel.dateSpan, `${total} option${total === 1 ? "" : "s"}`, low ? `from ${low.price}` : null].filter(Boolean).join(" · ")}
          </Text>
        </View>
        {live ? (
          <View style={styles.live}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live</Text>
          </View>
        ) : null}
      </View>

      <MiniOffer offer={best} tag="Recommended" />
      {low && low.id !== best.id ? <MiniOffer offer={low} tag="Cheapest" /> : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View all ${total} results with filters`}
        onPress={open}
        style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
      >
        <Text style={styles.ctaText}>View {total} results</Text>
        <Ionicons name="arrow-forward" size={17} color={colors.onBtn} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md + 6,
    padding: space.lg,
    gap: space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    ...shadow,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  flex: { flex: 1, gap: 1 },
  head: { flexDirection: "row", alignItems: "center", gap: space.md },
  title: { fontFamily: fonts.displaySemi, fontSize: 16, lineHeight: 22, color: colors.ink },
  sub: { fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft },
  live: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: colors.successSoft, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  liveText: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.success },
  mini: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    paddingHorizontal: space.md,
    paddingVertical: space.md - 2,
  },
  miniTag: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase", color: colors.accent },
  miniTitle: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.ink },
  miniSub: { fontFamily: fonts.body, fontSize: 12, color: colors.inkSoft },
  miniPrice: { fontFamily: fonts.display, fontSize: 16, color: colors.ink },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    minHeight: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.btn,
  },
  ctaText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.onBtn },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  empty: { fontFamily: fonts.body, fontSize: 14, color: colors.inkSoft, paddingHorizontal: space.xs },
});
