import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button, Tag } from "@/core/components";
import { colors, fonts, space, type } from "@/core/theme/tokens";
import type { SearchResultsPanel } from "../types";
import { OfferCardView } from "./OfferCardView";

const FIRST_PAGE = 3;
const PAGE = 5;

/** Results that came with one Ava reply: summary line, cards, "show more". */
export function ResultsPanel({ panel }: { panel: SearchResultsPanel }) {
  const [shown, setShown] = useState(FIRST_PAGE);
  const offers = panel.offers ?? [];
  const live = panel.liveFlights || panel.liveHotels;

  if (!offers.length) {
    return panel.emptyHint ? <Text style={[type.bodySoft, styles.empty]}>{panel.emptyHint}</Text> : null;
  }

  const total = Math.max(panel.totalCount || 0, offers.length);
  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.title} numberOfLines={1}>
            {panel.tripTitle || panel.queryLabel || panel.legRoute || "Options"}
          </Text>
          <Text style={type.bodySoft} numberOfLines={1}>
            {[panel.dateSpan, `${total} option${total === 1 ? "" : "s"}`].filter(Boolean).join(" · ")}
          </Text>
        </View>
        {live ? <Tag label="Live fares" tone="success" /> : null}
      </View>
      {offers.slice(0, shown).map((o) => (
        <OfferCardView key={o.id} offer={o} />
      ))}
      {shown < offers.length ? (
        <Button
          variant="ghost"
          label={`Show ${Math.min(PAGE, offers.length - shown)} more`}
          onPress={() => setShown((n) => n + PAGE)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.md },
  header: { flexDirection: "row", alignItems: "center", gap: space.md },
  flex: { flex: 1 },
  title: { fontFamily: fonts.displaySemi, fontSize: 15, color: colors.ink },
  empty: { paddingHorizontal: space.xs },
});
