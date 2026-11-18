import { StyleSheet, Text, View } from "react-native";
import { Card, Tag } from "@/core/components";
import { colors, fonts, space, type } from "@/core/theme/tokens";
import type { BookingDetail } from "../api/types";
import { formatMinor, voucherRefsFromMetadata } from "../lib/checkoutDisplay";
import type { HotelStay } from "../lib/hotelStay";
import { buildTicketDocument, formatDuration, formatFlightNumber, type TicketSegment } from "../lib/ticketDocument";

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Text style={type.bodySoft}>{label}</Text>
      <Text style={styles.value} selectable>
        {value}
      </Text>
    </View>
  );
}

function Segment({ s }: { s: TicketSegment }) {
  return (
    <View style={styles.segment}>
      <Text style={type.label}>
        {formatFlightNumber(s.carrier, s.flightNumber)} · {s.originCode} → {s.destinationCode}
      </Text>
      <Text style={type.bodySoft}>
        {s.departureDate} {s.departTimeLocal} → {s.arrivalDate !== s.departureDate ? `${s.arrivalDate} ` : ""}
        {s.arriveTimeLocal}
        {s.durationMinutes ? ` · ${formatDuration(s.durationMinutes)}` : ""}
      </Text>
    </View>
  );
}

/** Issued e-ticket (flights) or hotel confirmation. */
export function TicketView({ booking, stay }: { booking: BookingDetail; stay: HotelStay | null }) {
  if (stay) {
    const vouchers = voucherRefsFromMetadata(booking.metadata);
    return (
      <Card>
        <Tag label="Confirmed" tone="success" />
        <Text style={type.h2}>Booked with the hotel</Text>
        <Row label="Hotel" value={stay.hotelName} />
        <Row label="Stay" value={stay.checkInDate && stay.checkOutDate ? `${stay.checkInDate} → ${stay.checkOutDate}` : null} />
        <Row label="Confirmation" value={vouchers.join(", ") || booking.externalRef} />
        <Row label="Paid" value={formatMinor(booking.amountMinor, booking.currency)} />
      </Card>
    );
  }

  const t = buildTicketDocument(booking);
  return (
    <Card>
      <Tag label={t.demo ? "Demo ticket" : "E-ticket issued"} tone="success" />
      <Text style={type.h2}>Booked with the airline</Text>
      <Row label="Booking reference (PNR)" value={t.pnr} />
      <Row label="Ticket number" value={t.ticketNumbers.join(", ")} />
      <Row label="Passenger" value={t.passengerName} />
      <Row label="Cabin" value={t.cabin} />
      <Row label="Baggage" value={t.baggage} />
      {t.segments.length ? (
        <View style={styles.block}>
          <Text style={type.label}>Outbound</Text>
          {t.segments.map((s, i) => (
            <Segment key={`o${i}`} s={s} />
          ))}
        </View>
      ) : null}
      {t.returnSegments.length ? (
        <View style={styles.block}>
          <Text style={type.label}>Return</Text>
          {t.returnSegments.map((s, i) => (
            <Segment key={`r${i}`} s={s} />
          ))}
        </View>
      ) : null}
      <Row label="Total paid" value={formatMinor(t.totalMinor, t.currency)} />
      {t.demo ? <Text style={type.bodySoft}>Demo fare — issued locally with a DEMO reference, not sent to an airline.</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { gap: 2 },
  value: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.ink },
  block: { gap: space.sm },
  segment: { gap: 2, paddingLeft: space.sm, borderLeftWidth: 2, borderLeftColor: colors.accentSoft },
});
