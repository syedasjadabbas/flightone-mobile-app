import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { airlineDisplayName } from "@/core/lib/airlines";
import { colors, fonts, radius, shadow, space } from "@/core/theme/tokens";
import type { BookingDetail } from "../api/types";
import { formatMinor } from "../lib/checkoutDisplay";
import { mealLabel, type HotelStay } from "../lib/hotelStay";
import { buildTicketDocument, formatDuration, formatFlightNumber } from "../lib/ticketDocument";

const STATUS: Record<string, { label: string; fg: string; bg: string }> = {
  QUOTED: { label: "Quote", fg: "#7fd3f7", bg: "rgba(127,211,247,0.14)" },
  RESERVED: { label: "Seat held", fg: "#ffd27a", bg: "rgba(255,210,122,0.14)" },
  TICKETED: { label: "Ticketed", fg: "#7be3b0", bg: "rgba(123,227,176,0.14)" },
  ACTIVE: { label: "Active", fg: "#7be3b0", bg: "rgba(123,227,176,0.14)" },
  COMPLETED: { label: "Completed", fg: "rgba(255,255,255,0.7)", bg: "rgba(255,255,255,0.1)" },
  CANCELLED: { label: "Cancelled", fg: "#ff9a8f", bg: "rgba(255,154,143,0.14)" },
  REFUNDED: { label: "Refunded", fg: "rgba(255,255,255,0.7)", bg: "rgba(255,255,255,0.1)" },
};

/** "Thu 10 Dec" from "2026-12-10". */
function niceDate(iso?: string | null): string | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso ?? null;
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

const cap = (s?: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : null);

/** Live "11:42 left" for a held price; null once it has expired. */
function useCountdown(until?: string | null): { label: string; urgent: boolean } | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!until) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [until]);
  if (!until) return null;
  const ms = Date.parse(until) - now;
  if (!Number.isFinite(ms) || ms <= 0) return { label: "Price hold expired", urgent: true };
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return { label: `Price held · ${m}:${String(s).padStart(2, "0")} left`, urgent: ms < 3 * 60000 };
}

/**
 * What's being booked and what it costs (the server's price, never the card's),
 * styled like a boarding pass: route, times and flight on top, a tear line, then the total.
 */
export function BookingSummary({ booking, stay, payableMinor }: { booking: BookingDetail; stay: HotelStay | null; payableMinor: number }) {
  const status = STATUS[booking.status] ?? { label: cap(booking.status) ?? booking.status, fg: "#fff", bg: "rgba(255,255,255,0.1)" };
  const trip = stay ? null : buildTicketDocument(booking);
  const first = trip?.segments[0];
  const last = trip?.segments[trip.segments.length - 1];
  const stops = trip ? trip.segments.length - 1 : 0;
  const hold = useCountdown(booking.status === "QUOTED" ? booking.quoteExpiresAt : null);

  return (
    <View style={styles.pass}>
      <View style={styles.top}>
        <View style={styles.head}>
          <View style={[styles.status, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.fg }]}>{status.label}</Text>
          </View>
          <Text style={styles.ref}>Ref {booking.id.slice(-8).toUpperCase()}</Text>
        </View>

        {stay ? (
          <View style={styles.stay}>
            <View style={styles.stayIcon}>
              <Ionicons name="bed" size={20} color="#7fd3f7" />
            </View>
            <View style={styles.flex}>
              <Text style={styles.stayName}>{stay.hotelName}</Text>
              <Text style={styles.muted}>{[stay.area, stay.city].filter(Boolean).join(", ")}</Text>
            </View>
          </View>
        ) : trip ? (
          <View style={styles.route}>
            <View style={styles.end}>
              <Text style={styles.code}>{trip.originCode ?? "—"}</Text>
              {first?.departTimeLocal ? <Text style={styles.time}>{first.departTimeLocal}</Text> : null}
            </View>
            <View style={styles.path}>
              <Text style={styles.duration}>{first?.durationMinutes && stops === 0 ? formatDuration(first.durationMinutes) : ""}</Text>
              <View style={styles.line}>
                <View style={styles.dash} />
                <Ionicons name="airplane" size={18} color="#7fd3f7" />
                <View style={styles.dash} />
              </View>
              <Text style={styles.stops}>{stops === 0 ? "Non-stop" : `${stops} stop${stops > 1 ? "s" : ""}`}</Text>
            </View>
            <View style={[styles.end, styles.endRight]}>
              <Text style={styles.code}>{trip.destinationCode ?? "—"}</Text>
              {last?.arriveTimeLocal ? <Text style={styles.time}>{last.arriveTimeLocal}</Text> : null}
            </View>
          </View>
        ) : null}

        {/* Facts grid */}
        <View style={styles.facts}>
          {stay ? (
            <>
              <Fact label="Check-in" value={niceDate(stay.checkInDate)} />
              <Fact label="Check-out" value={niceDate(stay.checkOutDate)} />
              <Fact label="Nights" value={stay.nights ? String(stay.nights) : null} />
            </>
          ) : trip ? (
            <>
              <Fact label={trip.returnDate ? "Depart" : "Date"} value={niceDate(trip.departureDate)} />
              {trip.returnDate ? <Fact label="Return" value={niceDate(trip.returnDate)} /> : null}
              <Fact label="Cabin" value={cap(trip.cabin)} />
              {first ? <Fact label="Flight" value={formatFlightNumber(first.carrier, first.flightNumber)} /> : null}
            </>
          ) : null}
        </View>
        {first?.carrier || trip?.baggage || stay ? (
          <Text style={styles.muted} numberOfLines={2}>
            {stay
              ? [stay.roomType, mealLabel(stay.meal), stay.cancellationDeadline ? `Free cancellation until ${stay.cancellationDeadline.slice(0, 16).replace("T", " ")}` : null]
                  .filter(Boolean)
                  .join(" · ")
              : [first?.carrier ? airlineDisplayName(first.carrier) : null, trip?.baggage ? `Baggage ${trip.baggage}` : null].filter(Boolean).join(" · ")}
          </Text>
        ) : null}
      </View>

      {/* Tear line */}
      <View style={styles.tear}>
        <View style={[styles.notch, styles.notchLeft]} />
        <View style={styles.tearDash} />
        <View style={[styles.notch, styles.notchRight]} />
      </View>

      <View style={styles.bottom}>
        <View style={styles.flex}>
          <Text style={styles.totalLabel}>Total{booking.amountMinor !== payableMinor ? " after rewards" : ""}</Text>
          {payableMinor !== booking.amountMinor ? (
            <Text style={styles.strike}>{formatMinor(booking.amountMinor, booking.currency)}</Text>
          ) : null}
        </View>
        <Text style={styles.amount}>{formatMinor(payableMinor, booking.currency)}</Text>
      </View>
      {hold ? (
        <View style={[styles.hold, hold.urgent && styles.holdUrgent]}>
          <Ionicons name="time-outline" size={14} color={hold.urgent ? colors.danger : "#8a5a00"} />
          <Text style={[styles.holdText, hold.urgent && styles.holdTextUrgent]}>{hold.label}</Text>
        </View>
      ) : null}
    </View>
  );
}

function Fact({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pass: { borderRadius: radius.md + 10, overflow: "hidden", backgroundColor: colors.card, ...shadow, shadowOpacity: 0.12 },
  top: { backgroundColor: colors.night, padding: space.lg, gap: space.lg },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  status: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1, textTransform: "uppercase" },
  ref: { fontFamily: fonts.bodySemi, fontSize: 12, color: "rgba(255,255,255,0.6)", letterSpacing: 0.8 },

  route: { flexDirection: "row", alignItems: "center", gap: space.sm },
  end: { gap: 2 },
  endRight: { alignItems: "flex-end" },
  code: { fontFamily: fonts.display, fontSize: 34, color: "#fff", letterSpacing: 1 },
  time: { fontFamily: fonts.bodySemi, fontSize: 15, color: "rgba(255,255,255,0.85)" },
  path: { flex: 1, alignItems: "center", gap: 3 },
  line: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "stretch" },
  dash: { flex: 1, height: 0, borderTopWidth: 1.5, borderStyle: "dashed", borderColor: "rgba(255,255,255,0.35)" },
  duration: { fontFamily: fonts.bodyMedium, fontSize: 12, color: "rgba(255,255,255,0.7)", minHeight: 16 },
  stops: { fontFamily: fonts.bodySemi, fontSize: 12, color: "#7fd3f7" },

  stay: { flexDirection: "row", alignItems: "center", gap: space.md },
  stayIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(127,211,247,0.14)", alignItems: "center", justifyContent: "center" },
  stayName: { fontFamily: fonts.display, fontSize: 20, color: "#fff" },

  facts: { flexDirection: "row", gap: space.sm },
  fact: { flex: 1, backgroundColor: "rgba(255,255,255,0.07)", borderRadius: radius.sm, paddingVertical: 8, paddingHorizontal: 10, gap: 2 },
  factLabel: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase", color: "rgba(255,255,255,0.5)" },
  factValue: { fontFamily: fonts.bodySemi, fontSize: 13, color: "#fff" },
  muted: { fontFamily: fonts.body, fontSize: 13, color: "rgba(255,255,255,0.65)" },

  tear: { height: 22, justifyContent: "center", backgroundColor: colors.card },
  tearDash: { marginHorizontal: 18, borderTopWidth: 1.5, borderStyle: "dashed", borderColor: colors.line },
  notch: { position: "absolute", width: 22, height: 22, borderRadius: 11, backgroundColor: colors.bg, top: 0 },
  notchLeft: { left: -11 },
  notchRight: { right: -11 },

  bottom: { flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.lg, paddingBottom: space.md },
  totalLabel: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.inkSoft },
  strike: { fontFamily: fonts.body, fontSize: 12, color: colors.inkFaint, textDecorationLine: "line-through" },
  amount: { fontFamily: fonts.display, fontSize: 26, color: colors.ink },
  hold: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginHorizontal: space.lg,
    marginBottom: space.lg,
    backgroundColor: "#fdf1dc",
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  holdUrgent: { backgroundColor: colors.dangerSoft },
  holdText: { fontFamily: fonts.bodySemi, fontSize: 12, color: "#8a5a00" },
  holdTextUrgent: { color: colors.danger },
});
