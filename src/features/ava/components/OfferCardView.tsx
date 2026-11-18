import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button, Notice, Tag } from "@/core/components";
import { useStartCheckout } from "@/features/checkout/hooks/useStartCheckout";
import { colors, fonts, radius, shadow, space, type } from "@/core/theme/tokens";
import { angleLabel, formatDuration, formatStops, stars } from "../lib/format";
import type { OfferCard } from "../types";

/** One flight or hotel offer. Tap to show Ava's reasons and fare details. */
export function OfferCardView({ offer }: { offer: OfferCard }) {
  const [open, setOpen] = useState(false);
  const angle = angleLabel(offer.angle);
  const f = offer.flight;
  const h = offer.hotel;

  // Only the summary toggles; the details (with the Book button) sit outside the
  // pressable so a button is never nested inside another button.
  return (
    <View style={styles.card}>
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={`${offer.title}, ${offer.price}`}
      accessibilityHint={open ? "Hides details" : "Shows details and booking"}
      onPress={() => setOpen((v) => !v)}
      style={({ pressed }) => [styles.summary, pressed && styles.pressed]}
    >
      <View style={styles.topRow}>
        {angle ? <Tag label={angle} /> : <View />}
        {offer.savingsPct && offer.savingsPct > 0 ? <Tag label={`Save ${Math.round(offer.savingsPct)}%`} tone="success" /> : null}
      </View>

      {f ? (
        <View style={styles.route}>
          <View style={styles.end}>
            <Text style={styles.time}>{f.departTimeLocal}</Text>
            <Text style={styles.code}>{f.originCode}</Text>
          </View>
          <View style={styles.middle}>
            <Text style={styles.meta}>{formatDuration(f.durationMinutes)}</Text>
            <View style={styles.line} />
            <Text style={[styles.meta, !f.stops && styles.nonstop]}>{formatStops(f.stops)}</Text>
          </View>
          <View style={[styles.end, styles.endRight]}>
            <Text style={styles.time}>{f.arriveTimeLocal ?? "—"}</Text>
            <Text style={styles.code}>{f.destinationCode}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.bottomRow}>
        <View style={styles.flex}>
          <Text style={type.h3} numberOfLines={1}>
            {h ? h.name : f ? f.airline : offer.title}
          </Text>
          <Text style={type.bodySoft} numberOfLines={2}>
            {h ? [stars(h.stars), h.area || h.city, h.roomType].filter(Boolean).join(" · ") : offer.subtitle}
          </Text>
        </View>
        <View style={styles.priceBox}>
          <Text style={styles.price}>{offer.price}</Text>
          {h?.nights ? <Text style={styles.meta}>per night</Text> : f?.cabin ? <Text style={styles.meta}>{f.cabin}</Text> : null}
        </View>
      </View>
    </Pressable>

      {open ? (
        <View style={styles.details}>
          {h ? (
            <Text style={type.bodySoft}>
              {[
                h.nights ? `${h.nights} night${h.nights > 1 ? "s" : ""}${h.stayPrice ? ` · ${h.stayPrice} total` : ""}` : null,
                h.breakfastIncluded ? "Breakfast included" : h.meal || null,
                h.refundable ? `Free cancellation${h.cancellationDeadline ? ` until ${h.cancellationDeadline.slice(0, 10)}` : ""}` : "Non-refundable",
                h.roomsLeft ? `${h.roomsLeft} room${h.roomsLeft > 1 ? "s" : ""} left` : null,
              ]
                .filter(Boolean)
                .join("\n")}
            </Text>
          ) : null}
          {f ? (
            <Text style={type.bodySoft}>
              {[
                f.flightNumber ? `Flight ${f.flightNumber}` : null,
                f.departureDate ? `Departs ${f.departureDate}` : null,
                offer.roundTrip && f.returnDate ? `Returns ${f.returnDate}` : null,
                f.fareBrandName ? `Fare: ${f.fareBrandName}` : null,
                f.baggageKg ? `${f.baggageKg} kg checked bag` : null,
                f.refundable === true ? "Refundable" : f.refundable === false ? "Non-refundable" : null,
              ]
                .filter(Boolean)
                .join("\n")}
            </Text>
          ) : null}
          {offer.reasons.length ? (
            <View style={styles.reasons}>
              <Text style={type.label}>Why Ava picked this</Text>
              {offer.reasons.slice(0, 4).map((r) => (
                <Text key={r} style={type.bodySoft}>
                  • {r}
                </Text>
              ))}
            </View>
          ) : null}
          {offer.marketPrice ? <Text style={styles.meta}>Market price {offer.marketPrice}</Text> : null}
          <BookAction offer={offer} />
        </View>
      ) : null}
    </View>
  );
}

/** "Book" (quote → checkout), or why this fare can't be booked online. */
function BookAction({ offer }: { offer: OfferCard }) {
  const { start, isLoading, error, blocked } = useStartCheckout(offer);
  return (
    <View style={styles.book}>
      {blocked ? (
        <Notice tone="info" message={blocked.reason} />
      ) : (
        <Button label={`Book for ${offer.price}`} onPress={start} loading={isLoading} />
      )}
      {error && !blocked ? <Notice message={error} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  book: { gap: space.sm, marginTop: space.xs },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    padding: space.lg,
    gap: space.md,
    ...shadow,
  },
  summary: { gap: space.md },
  pressed: { opacity: 0.92 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  route: { flexDirection: "row", alignItems: "center", gap: space.sm },
  end: { minWidth: 64 },
  endRight: { alignItems: "flex-end" },
  time: { fontFamily: fonts.display, fontSize: 20, color: colors.ink },
  code: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.inkSoft, letterSpacing: 0.5 },
  middle: { flex: 1, alignItems: "center", gap: 2 },
  line: { height: 1, alignSelf: "stretch", backgroundColor: colors.line },
  meta: { fontFamily: fonts.body, fontSize: 12, color: colors.inkSoft },
  nonstop: { color: colors.success, fontFamily: fonts.bodySemi },
  bottomRow: { flexDirection: "row", alignItems: "flex-end", gap: space.md },
  flex: { flex: 1, gap: 2 },
  priceBox: { alignItems: "flex-end" },
  price: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  details: { gap: space.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, paddingTop: space.md },
  reasons: { gap: 2 },
});
