import { StyleSheet, Text, View } from "react-native";
import { Card, Tag } from "@/core/components";
import { colors, fonts, space, type } from "@/core/theme/tokens";
import type { BookingDetail } from "../api/types";
import { formatMinor } from "../lib/checkoutDisplay";
import { mealLabel, type HotelStay } from "../lib/hotelStay";
import { buildTicketDocument, formatDuration, formatFlightNumber } from "../lib/ticketDocument";

const STATUS: Record<string, { label: string; tone: "accent" | "success" | "neutral" }> = {
  QUOTED: { label: "Quote", tone: "accent" },
  RESERVED: { label: "Reserved", tone: "accent" },
  TICKETED: { label: "Ticketed", tone: "success" },
  ACTIVE: { label: "Active", tone: "success" },
  COMPLETED: { label: "Completed", tone: "neutral" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
  REFUNDED: { label: "Refunded", tone: "neutral" },
};

/** What's being booked and what it costs (server's price, never the card's). */
export function BookingSummary({ booking, stay, payableMinor }: { booking: BookingDetail; stay: HotelStay | null; payableMinor: number }) {
  const status = STATUS[booking.status] ?? { label: booking.status, tone: "neutral" as const };
  const trip = stay ? null : buildTicketDocument(booking);
  const first = trip?.segments[0];

  return (
    <Card>
      <View style={styles.head}>
        <Tag label={status.label} tone={status.tone} />
        <Text style={styles.ref}>Ref {booking.id.slice(-8).toUpperCase()}</Text>
      </View>

      {stay ? (
        <View style={styles.block}>
          <Text style={type.h2}>{stay.hotelName}</Text>
          <Text style={type.bodySoft}>{[stay.area, stay.city].filter(Boolean).join(", ")}</Text>
          <Text style={type.body}>
            {[stay.checkInDate && stay.checkOutDate ? `${stay.checkInDate} → ${stay.checkOutDate}` : null, stay.nights ? `${stay.nights} night${stay.nights > 1 ? "s" : ""}` : null]
              .filter(Boolean)
              .join(" · ")}
          </Text>
          <Text style={type.bodySoft}>{[stay.roomType, mealLabel(stay.meal)].filter(Boolean).join(" · ")}</Text>
          {stay.cancellationDeadline ? (
            <Text style={type.bodySoft}>Free cancellation until {stay.cancellationDeadline.slice(0, 16).replace("T", " ")}</Text>
          ) : null}
        </View>
      ) : trip ? (
        <View style={styles.block}>
          <Text style={type.h2}>
            {trip.originCode ?? "—"} → {trip.destinationCode ?? "—"}
            {trip.isRoundTrip ? " · return" : ""}
          </Text>
          <Text style={type.body}>
            {[trip.departureDate, trip.returnDate ? `back ${trip.returnDate}` : null, trip.cabin].filter(Boolean).join(" · ")}
          </Text>
          {first ? (
            <Text style={type.bodySoft}>
              {formatFlightNumber(first.carrier, first.flightNumber)} · {first.departTimeLocal} → {first.arriveTimeLocal}
              {first.durationMinutes ? ` · ${formatDuration(first.durationMinutes)}` : ""}
              {trip.segments.length > 1 ? ` · ${trip.segments.length - 1} stop${trip.segments.length > 2 ? "s" : ""}` : " · non-stop"}
            </Text>
          ) : null}
          {trip.baggage ? <Text style={type.bodySoft}>Baggage: {trip.baggage}</Text> : null}
        </View>
      ) : null}

      <View style={styles.total}>
        <Text style={type.label}>Total</Text>
        <Text style={styles.amount}>{formatMinor(payableMinor, booking.currency)}</Text>
      </View>
      {payableMinor !== booking.amountMinor ? (
        <Text style={type.bodySoft}>After reward credit (fare {formatMinor(booking.amountMinor, booking.currency)})</Text>
      ) : null}
      {booking.status === "QUOTED" && booking.quoteExpiresAt ? (
        <Text style={type.bodySoft}>Price held until {new Date(booking.quoteExpiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  ref: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.inkSoft, letterSpacing: 0.5 },
  block: { gap: 4 },
  total: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, paddingTop: space.md },
  amount: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
});
