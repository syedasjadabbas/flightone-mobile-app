import { useState, type ReactNode } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { Button, Notice, TINT, type TintName } from "@/core/components";
import { airlineDisplayName } from "@/core/lib/airlines";
import { iataToPlace } from "@/core/lib/places";
import { useStartCheckout } from "@/features/checkout/hooks/useStartCheckout";
import { colors, fonts, radius, shadow, space } from "@/core/theme/tokens";
import { angleLabel, formatDuration, formatStops } from "../lib/format";
import type { OfferCard, OfferCardFlight, OfferCardHotel } from "../types";

type IconName = keyof typeof Ionicons.glyphMap;

const CARD_RADIUS = radius.md + 6;
const CABIN: Record<OfferCardFlight["cabin"], string> = { economy: "Economy", premium: "Premium economy", business: "Business" };
const BADGE_TINTS: TintName[] = ["blue", "violet", "teal", "amber", "green", "slate", "rose"];

/** "Thu 10 Dec" from "2026-12-10"; anything else is returned as is. */
function niceDate(iso?: string | null): string | null {
  if (!iso) return null;
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso;
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

function minutesOf(hhmm: string | null | undefined): number | null {
  const m = hhmm ? /^(\d{1,2}):(\d{2})/.exec(hhmm.trim()) : null;
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** Arrival clock earlier than departure on a flight under a day long → it lands the next day. */
function nextDay(f: OfferCardFlight): boolean {
  const dep = minutesOf(f.departTimeLocal);
  const arr = minutesOf(f.arriveTimeLocal);
  return dep != null && arr != null && arr < dep && f.durationMinutes > 0 && f.durationMinutes < 24 * 60;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function tintFor(key: string) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return TINT[BADGE_TINTS[h % BADGE_TINTS.length]];
}

function metaString(offer: OfferCard, key: string): string | null {
  const v = offer.metadata?.[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/** One flight or hotel offer. Tap to show Ava's reasons, fare details and Book. */
export function OfferCardView({ offer }: { offer: OfferCard }) {
  const [open, setOpen] = useState(false);
  const [pressed, setPressed] = useState(false);
  const f = offer.flight;
  const h = offer.hotel;

  const toggle = () => {
    void Haptics.selectionAsync().catch(() => {});
    setOpen((v) => !v);
  };

  // Only the summary toggles; the details (with the Book button) sit outside the
  // pressable so a button is never nested inside another button.
  return (
    <View style={[styles.card, pressed && styles.cardPressed]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${offer.title}, ${offer.price}`}
        accessibilityHint={open ? "Hides details" : "Shows details and booking"}
        onPress={toggle}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        style={styles.summary}
      >
        {h ? <HotelImage hotel={h} /> : null}
        <TopRow offer={offer} />
        {f ? <FlightSummary offer={offer} f={f} /> : h ? <HotelSummary offer={offer} h={h} /> : <GenericSummary offer={offer} />}
        <View style={styles.moreRow}>
          <Text style={styles.moreText}>{open ? "Hide details" : "Details & book"}</Text>
          <Ionicons name={open ? "chevron-up" : "chevron-down"} size={14} color={colors.accent} />
        </View>
      </Pressable>

      {open ? (
        <View style={styles.details}>
          <Details offer={offer} />
          <BookAction offer={offer} />
        </View>
      ) : null}
    </View>
  );
}

/** Angle tag (Recommended / Cheapest…), an extra badge, and the savings chip. */
function TopRow({ offer }: { offer: OfferCard }) {
  const angle = angleLabel(offer.angle);
  const extra = offer.badges.find((b) => b && b.toLowerCase() !== angle?.toLowerCase());
  const save = offer.savingsPct && offer.savingsPct > 0 ? Math.round(offer.savingsPct) : 0;
  if (!angle && !extra && !save) return null;
  return (
    <View style={styles.topRow}>
      <View style={styles.tags}>
        {angle ? <Chip label={angle} tone="accent" icon={offer.angle === "cheapest" ? "pricetag" : offer.angle === "fastest" ? "flash" : "sparkles"} /> : null}
        {extra ? <Chip label={extra} tone="neutral" /> : null}
      </View>
      {save ? <Chip label={`Save ${save}%`} tone="success" icon="trending-down" /> : null}
    </View>
  );
}

function Chip({ label, tone, icon }: { label: string; tone: "accent" | "success" | "neutral"; icon?: IconName }) {
  const p =
    tone === "success"
      ? { bg: colors.successSoft, fg: colors.success }
      : tone === "neutral"
        ? { bg: colors.bg, fg: colors.inkSoft }
        : { bg: colors.accentSoft, fg: colors.accent };
  return (
    <View style={[styles.chip, { backgroundColor: p.bg }]}>
      {icon ? <Ionicons name={icon} size={11} color={p.fg} /> : null}
      <Text style={[styles.chipText, { color: p.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function FlightSummary({ offer, f }: { offer: OfferCard; f: OfferCardFlight }) {
  const airline = airlineDisplayName(f.airline || f.airlineCode);
  const code = (f.airlineCode || "").trim().toUpperCase();
  const t = tintFor(code || airline);
  const returnDate = f.returnDate ?? offer.returnDate;
  const hasReturn = Boolean(returnDate || f.returnStops != null || f.returnDurationMinutes);
  return (
    <View style={styles.flightBody}>
      <View style={styles.route}>
        <View style={styles.end}>
          <Text style={styles.time}>{f.departTimeLocal || "—"}</Text>
          <Text style={styles.code}>{f.originCode}</Text>
        </View>
        <View style={styles.middle}>
          <Text style={styles.duration}>{formatDuration(f.durationMinutes) || " "}</Text>
          <View style={styles.track}>
            <View style={styles.trackDot} />
            <View style={styles.trackLine} />
            <Ionicons name="airplane" size={13} color={colors.accent} />
            <View style={styles.trackLine} />
            <View style={styles.trackDot} />
          </View>
          <Text style={[styles.stops, !f.stops && styles.nonstop]}>{formatStops(f.stops)}</Text>
        </View>
        <View style={[styles.end, styles.endRight]}>
          <View style={styles.arriveRow}>
            <Text style={styles.time}>{f.arriveTimeLocal ?? "—"}</Text>
            {nextDay(f) ? <Text style={styles.plusDay}>+1</Text> : null}
          </View>
          <Text style={styles.code}>{f.destinationCode}</Text>
        </View>
      </View>

      {hasReturn ? (
          <View style={styles.returnRow}>
            <Ionicons name="return-down-back" size={13} color={colors.inkSoft} />
            <Text style={styles.returnText} numberOfLines={1}>
              {[
                `Return ${f.destinationCode} → ${f.originCode}`,
                niceDate(returnDate),
                formatDuration(f.returnDurationMinutes) || null,
                f.returnStops != null ? formatStops(f.returnStops) : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          </View>
      ) : null}

      <View style={styles.divider} />

      <View style={styles.bottomRow}>
        <View style={[styles.airlineBadge, { backgroundColor: t.bg }]}>
          <Text style={[styles.airlineBadgeText, { color: t.fg }]}>{code.length === 2 ? code : initials(airline) || "✈"}</Text>
        </View>
        <View style={styles.flex}>
          <Text style={styles.airline} numberOfLines={1}>
            {airline}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.meta} numberOfLines={1}>
              {CABIN[f.cabin] ?? f.cabin}
            </Text>
            {f.baggageKg ? (
              <View style={styles.metaIcon}>
                <Ionicons name="briefcase-outline" size={12} color={colors.inkSoft} />
                <Text style={styles.meta}>{f.baggageKg} kg</Text>
              </View>
            ) : null}
          </View>
        </View>
        <Price offer={offer} />
      </View>
    </View>
  );
}

function HotelImage({ hotel }: { hotel: OfferCardHotel }) {
  const [failed, setFailed] = useState(false);
  const uri = hotel.imageUrls?.find((u) => typeof u === "string" && u.length > 0);
  if (!uri || failed) return null;
  return <Image source={{ uri }} style={styles.image} resizeMode="cover" onError={() => setFailed(true)} accessibilityIgnoresInvertColors />;
}

function HotelSummary({ offer, h }: { offer: OfferCard; h: OfferCardHotel }) {
  const starCount = Math.max(0, Math.min(5, Math.round(h.stars || 0)));
  const place = [h.area, h.city].filter(Boolean).join(", ");
  return (
    <View style={styles.hotelBody}>
      <View style={styles.flex}>
        <Text style={styles.hotelName} numberOfLines={2}>
          {h.name}
        </Text>
        {starCount ? (
          <View style={styles.starRow} accessibilityLabel={`${starCount} star hotel`}>
            {Array.from({ length: starCount }, (_, i) => (
              <Ionicons key={i} name="star" size={12} color="#e0a100" />
            ))}
          </View>
        ) : null}
        {place ? (
          <View style={styles.metaIcon}>
            <Ionicons name="location-outline" size={12} color={colors.inkSoft} />
            <Text style={styles.meta} numberOfLines={1}>
              {place}
            </Text>
          </View>
        ) : null}
        {h.roomType ? (
          <Text style={styles.meta} numberOfLines={1}>
            {h.roomType}
          </Text>
        ) : null}
      </View>
      <View style={styles.hotelFoot}>
        <View style={styles.tags}>
          {h.breakfastIncluded ? <Chip label="Breakfast" tone="success" icon="cafe-outline" /> : null}
          {h.refundable ? <Chip label="Free cancellation" tone="success" icon="checkmark" /> : null}
        </View>
        <Price offer={offer} />
      </View>
    </View>
  );
}

function GenericSummary({ offer }: { offer: OfferCard }) {
  return (
    <View style={styles.bottomRow}>
      <Text style={[styles.airline, styles.flex]} numberOfLines={2}>
        {offer.title}
      </Text>
      <Price offer={offer} />
    </View>
  );
}

/** Price on the right; the caption only states what the data says (nights for hotels). */
function Price({ offer }: { offer: OfferCard }) {
  const h = offer.hotel;
  const caption = h?.nights ? (h.stayPrice ? `per night · ${h.nights} night${h.nights > 1 ? "s" : ""}` : `${h.nights} night${h.nights > 1 ? "s" : ""}`) : null;
  return (
    <View style={styles.priceBox}>
      {offer.marketPrice && offer.savingsPct && offer.savingsPct > 0 ? <Text style={styles.strike}>{offer.marketPrice}</Text> : null}
      <Text style={styles.price} numberOfLines={1}>
        {offer.price}
      </Text>
      {caption ? <Text style={styles.priceCaption}>{caption}</Text> : null}
    </View>
  );
}

function DetailRow({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={15} color={colors.inkSoft} style={styles.detailIcon} />
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function Details({ offer }: { offer: OfferCard }) {
  const f = offer.flight;
  const h = offer.hotel;
  const rows: { icon: IconName; label: string; value: string }[] = [];

  if (f) {
    const aircraft = metaString(offer, "aircraft") ?? metaString(offer, "aircraftType");
    if (f.departureDate) rows.push({ icon: "calendar-outline", label: "Departs", value: [niceDate(f.departureDate), `${iataToPlace(f.originCode)} → ${iataToPlace(f.destinationCode)}`].filter(Boolean).join(" · ") });
    const ret = f.returnDate ?? offer.returnDate;
    if (offer.roundTrip && ret) rows.push({ icon: "return-down-back", label: "Returns", value: niceDate(ret) ?? ret });
    if (f.flightNumber) rows.push({ icon: "airplane-outline", label: "Flight", value: f.flightNumber });
    if (aircraft) rows.push({ icon: "airplane", label: "Aircraft", value: aircraft });
    if (f.fareBrandName) rows.push({ icon: "ribbon-outline", label: "Fare", value: f.fareBrandName });
    if (f.baggageKg) rows.push({ icon: "briefcase-outline", label: "Baggage", value: `${f.baggageKg} kg checked` });
    if (f.refundable != null) rows.push({ icon: f.refundable ? "refresh-circle-outline" : "close-circle-outline", label: "Changes", value: f.refundable ? "Refundable" : "Non-refundable" });
  }
  if (h) {
    const dates = [niceDate(h.checkInDate), niceDate(h.checkOutDate)].filter(Boolean).join(" → ");
    if (dates) rows.push({ icon: "calendar-outline", label: "Stay", value: dates });
    if (h.nights) rows.push({ icon: "moon-outline", label: "Nights", value: `${h.nights} night${h.nights > 1 ? "s" : ""}${h.stayPrice ? ` · ${h.stayPrice} total` : ""}` });
    if (h.roomType) rows.push({ icon: "bed-outline", label: "Room", value: h.roomType });
    rows.push({ icon: "restaurant-outline", label: "Meals", value: h.breakfastIncluded ? "Breakfast included" : h.meal || "Room only" });
    rows.push({
      icon: h.refundable ? "checkmark-circle-outline" : "close-circle-outline",
      label: "Cancellation",
      value: h.refundable ? `Free${h.cancellationDeadline ? ` until ${niceDate(h.cancellationDeadline.slice(0, 10))}` : ""}` : "Non-refundable",
    });
    if (h.roomsLeft) rows.push({ icon: "flame-outline", label: "Availability", value: `${h.roomsLeft} room${h.roomsLeft > 1 ? "s" : ""} left` });
  }
  if (offer.marketPrice) rows.push({ icon: "stats-chart-outline", label: "Market price", value: offer.marketPrice });

  return (
    <View style={styles.detailsInner}>
      {offer.subtitle ? <Text style={styles.subtitle}>{offer.subtitle}</Text> : null}
      {rows.length ? (
        <View style={styles.detailTable}>
          {rows.map((r) => (
            <DetailRow key={r.label} icon={r.icon} label={r.label} value={r.value} />
          ))}
        </View>
      ) : null}
      {offer.reasons.length ? (
        <View style={styles.reasons}>
          <Text style={styles.sectionLabel}>Why Ava picked this</Text>
          {offer.reasons.slice(0, 4).map((r) => (
            <Tick key={r}>{r}</Tick>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function Tick({ children }: { children: ReactNode }) {
  return (
    <View style={styles.tick}>
      <View style={styles.tickDot}>
        <Ionicons name="checkmark" size={11} color={colors.success} />
      </View>
      <Text style={styles.tickText}>{children}</Text>
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
  card: {
    backgroundColor: colors.card,
    borderRadius: CARD_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    padding: space.lg,
    gap: space.md,
    ...shadow,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardPressed: { transform: [{ scale: 0.99 }], opacity: 0.96 },
  summary: { gap: space.md },
  flex: { flex: 1, gap: 2, minWidth: 0 },

  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: space.sm },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, flexShrink: 1 },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 3 },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.6, textTransform: "uppercase" },

  flightBody: { gap: space.md },
  route: { flexDirection: "row", alignItems: "center", gap: space.sm },
  end: { minWidth: 64 },
  endRight: { alignItems: "flex-end" },
  arriveRow: { flexDirection: "row", alignItems: "flex-start", gap: 2 },
  time: { fontFamily: fonts.display, fontSize: 22, lineHeight: 28, color: colors.ink },
  plusDay: { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.danger, marginTop: 2 },
  code: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.inkSoft, letterSpacing: 0.8 },
  middle: { flex: 1, alignItems: "center", gap: 3 },
  duration: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.inkSoft },
  track: { flexDirection: "row", alignItems: "center", alignSelf: "stretch", gap: 4 },
  trackLine: { flex: 1, height: 1, backgroundColor: colors.line },
  trackDot: { width: 5, height: 5, borderRadius: 3, borderWidth: 1, borderColor: colors.inkFaint },
  stops: { fontFamily: fonts.bodySemi, fontSize: 12, color: "#b26a00" },
  nonstop: { color: colors.success },
  returnRow: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.bg, borderRadius: radius.sm, paddingHorizontal: space.sm, paddingVertical: 6 },
  returnText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.inkSoft },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line },

  bottomRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  airlineBadge: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  airlineBadgeText: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 0.4 },
  airline: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.ink },
  metaRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  metaIcon: { flexDirection: "row", alignItems: "center", gap: 3 },
  meta: { fontFamily: fonts.body, fontSize: 12, color: colors.inkSoft },

  priceBox: { alignItems: "flex-end", flexShrink: 0 },
  strike: { fontFamily: fonts.body, fontSize: 11, color: colors.inkFaint, textDecorationLine: "line-through" },
  price: { fontFamily: fonts.display, fontSize: 20, lineHeight: 26, color: colors.ink },
  priceCaption: { fontFamily: fonts.body, fontSize: 11, color: colors.inkSoft },

  image: { width: "100%", height: 148, borderRadius: radius.md, backgroundColor: colors.bg },
  hotelBody: { gap: space.md },
  hotelName: { fontFamily: fonts.displaySemi, fontSize: 16, lineHeight: 22, color: colors.ink },
  starRow: { flexDirection: "row", gap: 1, marginVertical: 1 },
  hotelFoot: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: space.md },

  moreRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, marginTop: -space.xs },
  moreText: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.accent },

  details: { gap: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, paddingTop: space.md },
  detailsInner: { gap: space.md },
  subtitle: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.inkSoft },
  detailTable: { backgroundColor: colors.bg, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: space.xs },
  detailRow: { flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: 34 },
  detailIcon: { width: 18 },
  detailLabel: { fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft, width: 92 },
  detailValue: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 13, color: colors.ink, textAlign: "right" },
  sectionLabel: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", color: colors.inkSoft },
  reasons: { gap: 6 },
  tick: { flexDirection: "row", alignItems: "flex-start", gap: space.sm },
  tickDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.successSoft, alignItems: "center", justifyContent: "center", marginTop: 1 },
  tickText: { flex: 1, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.ink },
  book: { gap: space.sm },
});
