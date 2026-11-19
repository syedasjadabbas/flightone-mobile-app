import { useState } from "react";
import { ActivityIndicator, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { airlineDisplayName } from "@/core/lib/airlines";
import { colors, fonts, radius, shadow, space } from "@/core/theme/tokens";
import type { BookingDetail } from "../api/types";
import { formatMinor, voucherRefsFromMetadata } from "../lib/checkoutDisplay";
import type { HotelStay } from "../lib/hotelStay";
import { buildTicketDocument, formatDuration, formatFlightNumber, type TicketSegment } from "../lib/ticketDocument";
import { flightTicketHtml, hotelVoucherHtml } from "../lib/ticketHtml";
import { makeTicketPdf, printTicket, sharePdf } from "../lib/ticketPdf";

/** "Thu 10 Dec" from "2026-12-10". */
function niceDate(iso?: string | null): string | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso ?? null;
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

/** Big copyable code (PNR, ticket number, confirmation). */
function CodeBox({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await Clipboard.setStringAsync(value).catch(() => {});
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label} ${value}. Copy`} onPress={copy} style={({ pressed }) => [styles.code, pressed && styles.pressed]}>
      <Text style={styles.codeLabel}>{label}</Text>
      <View style={styles.codeRow}>
        <Text style={styles.codeValue} selectable numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
        <Ionicons name={copied ? "checkmark-circle" : "copy-outline"} size={16} color={copied ? colors.success : colors.inkFaint} />
      </View>
    </Pressable>
  );
}

/** One flight on a dot-and-line timeline. */
function Leg({ s }: { s: TicketSegment }) {
  const nextDay = s.arrivalDate && s.departureDate && s.arrivalDate !== s.departureDate;
  return (
    <View style={styles.leg}>
      <View style={styles.rail}>
        <View style={styles.dot} />
        <View style={styles.railLine} />
        <View style={[styles.dot, styles.dotEnd]} />
      </View>
      <View style={styles.legBody}>
        <View style={styles.legRow}>
          <Text style={styles.legTime}>{s.departTimeLocal}</Text>
          <Text style={styles.legCode}>{s.originCode}</Text>
          <Text style={styles.legDate}>{niceDate(s.departureDate)}</Text>
        </View>
        <View style={styles.legMid}>
          <Ionicons name="airplane" size={12} color={colors.accent} />
          <Text style={styles.legMidText}>
            {[s.carrier ? airlineDisplayName(s.carrier) : null, formatFlightNumber(s.carrier, s.flightNumber), s.durationMinutes ? formatDuration(s.durationMinutes) : null]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </View>
        <View style={styles.legRow}>
          <Text style={styles.legTime}>{s.arriveTimeLocal}</Text>
          <Text style={styles.legCode}>{s.destinationCode}</Text>
          {nextDay ? <Text style={styles.legNext}>{niceDate(s.arrivalDate)}</Text> : null}
        </View>
      </View>
    </View>
  );
}

/** E-ticket document actions: save as PDF, share the PDF, print. */
function TicketDocActions({ html, fileName, title }: { html: string; fileName: string; title: string }) {
  const [busy, setBusy] = useState<null | "pdf" | "print">(null);
  const [error, setError] = useState<string | null>(null);
  const run = async (kind: "pdf" | "print") => {
    setError(null);
    setBusy(kind);
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      if (kind === "print") await printTicket(html);
      else await sharePdf(await makeTicketPdf(html, fileName), title);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      // Closing the print dialog isn't an error worth showing.
      if (!/cancel/i.test(msg)) setError(msg || "Couldn't create the e-ticket. Please try again.");
    } finally {
      setBusy(null);
    }
  };
  return (
    <View style={styles.doc}>
      <View style={styles.docHead}>
        <View style={styles.docIcon}>
          <Ionicons name="document-text" size={20} color={colors.accent} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.docTitle}>{title}</Text>
          <Text style={styles.docSub}>PDF · save to Files, share or print</Text>
        </View>
      </View>
      <View style={styles.actionRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Download or share the e-ticket as a PDF"
          disabled={Boolean(busy)}
          onPress={() => void run("pdf")}
          style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
        >
          {busy === "pdf" ? <ActivityIndicator color={colors.onBtn} /> : <Ionicons name="download-outline" size={18} color={colors.onBtn} />}
          <Text style={styles.primaryText}>Download / Share PDF</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Print the e-ticket"
          disabled={Boolean(busy)}
          onPress={() => void run("print")}
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
        >
          {busy === "print" ? <ActivityIndicator color={colors.ink} /> : <Ionicons name="print-outline" size={20} color={colors.ink} />}
        </Pressable>
      </View>
      {error ? <Text style={styles.docError}>{error}</Text> : null}
    </View>
  );
}

function Actions({ share }: { share: string }) {
  return (
    <View style={styles.actions}>
      <View style={styles.actionRow}>
        <Pressable accessibilityRole="button" onPress={() => router.navigate("/trips")} style={({ pressed }) => [styles.secondary, styles.flex, pressed && styles.pressed]}>
          <Ionicons name="briefcase-outline" size={17} color={colors.ink} />
          <Text style={styles.secondaryText}>View in Trips</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Share booking details as text"
          onPress={() => void Share.share({ message: share }).catch(() => {})}
          style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
        >
          <Ionicons name="chatbubble-outline" size={17} color={colors.ink} />
          <Text style={styles.secondaryText}>Send details</Text>
        </Pressable>
      </View>
      <Pressable accessibilityRole="button" onPress={() => router.navigate("/ava")} style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
        <Ionicons name="sparkles" size={14} color={colors.accent} />
        <Text style={styles.linkText}>Back to Ava</Text>
      </Pressable>
    </View>
  );
}

function Booked({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.booked}>
      <View style={styles.check}>
        <Ionicons name="checkmark" size={30} color="#fff" />
      </View>
      <Text style={styles.bookedTitle}>{title}</Text>
      <Text style={styles.bookedBody}>{body}</Text>
    </View>
  );
}

/** Issued e-ticket (flights) or hotel confirmation, with copyable references and next steps. */
export function TicketView({ booking, stay }: { booking: BookingDetail; stay: HotelStay | null }) {
  if (stay) {
    const vouchers = voucherRefsFromMetadata(booking.metadata);
    const confirmation = vouchers.join(", ") || booking.externalRef || null;
    const share = [`FlightOne hotel booking`, stay.hotelName, stay.checkInDate && stay.checkOutDate ? `${stay.checkInDate} → ${stay.checkOutDate}` : null, confirmation ? `Confirmation: ${confirmation}` : null]
      .filter(Boolean)
      .join("\n");
    return (
      <>
        <Booked title="You're booked!" body="Your stay is confirmed. Show the confirmation at check-in." />
        <View style={styles.ticket}>
          <View style={styles.ticketHead}>
            <Text style={styles.eyebrow}>Hotel confirmation</Text>
            <View style={styles.okTag}>
              <Text style={styles.okTagText}>Confirmed</Text>
            </View>
          </View>
          {confirmation ? <CodeBox label="Confirmation" value={confirmation} /> : null}
          <View style={styles.infoRow}>
            <Ionicons name="bed-outline" size={18} color={colors.inkSoft} />
            <View style={styles.flex}>
              <Text style={styles.infoTitle}>{stay.hotelName}</Text>
              <Text style={styles.infoSub}>
                {[niceDate(stay.checkInDate), niceDate(stay.checkOutDate)].filter(Boolean).join(" → ")}
                {stay.nights ? ` · ${stay.nights} night${stay.nights > 1 ? "s" : ""}` : ""}
              </Text>
            </View>
          </View>
          <View style={styles.paid}>
            <Text style={styles.paidLabel}>Total paid</Text>
            <Text style={styles.paidValue}>{formatMinor(booking.amountMinor, booking.currency)}</Text>
          </View>
        </View>
        <TicketDocActions
          title="Hotel voucher"
          fileName={`FlightOne-Voucher-${confirmation ?? booking.id.slice(-8).toUpperCase()}`}
          html={hotelVoucherHtml(stay, {
            bookingRef: booking.id.slice(-8).toUpperCase(),
            confirmation,
            currency: booking.currency,
            amountMinor: booking.amountMinor,
          })}
        />
        <Actions share={share} />
      </>
    );
  }

  const t = buildTicketDocument(booking);
  const share = [
    `FlightOne e-ticket`,
    `${t.originCode ?? ""} → ${t.destinationCode ?? ""}${t.departureDate ? ` · ${niceDate(t.departureDate)}` : ""}`,
    t.pnr ? `Booking reference: ${t.pnr}` : null,
    t.ticketNumbers.length ? `Ticket: ${t.ticketNumbers.join(", ")}` : null,
    t.passengerName ? `Passenger: ${t.passengerName}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <>
      <Booked
        title="You're booked!"
        body={t.demo ? "Demo ticket issued. Nothing was sent to an airline." : "Your e-ticket is ready. We'll keep you posted on gate changes and delays in Trips."}
      />
      <View style={styles.ticket}>
        <View style={styles.ticketHead}>
          <Text style={styles.eyebrow}>E-ticket</Text>
          <View style={[styles.okTag, t.demo && styles.demoTag]}>
            <Text style={[styles.okTagText, t.demo && styles.demoTagText]}>{t.demo ? "Demo" : "Issued"}</Text>
          </View>
        </View>

        <View style={styles.codes}>
          {t.pnr ? <CodeBox label="Booking ref (PNR)" value={t.pnr} /> : null}
          {t.ticketNumbers.length ? <CodeBox label={t.ticketNumbers.length > 1 ? "Ticket numbers" : "Ticket number"} value={t.ticketNumbers.join(", ")} /> : null}
        </View>

        {t.passengerName ? (
          <View style={styles.infoRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(t.passengerName)}</Text>
            </View>
            <View style={styles.flex}>
              <Text style={styles.infoTitle}>{t.passengerName}</Text>
              <Text style={styles.infoSub}>{[t.cabin ? t.cabin.charAt(0).toUpperCase() + t.cabin.slice(1) : null, t.baggage ? `Baggage ${t.baggage}` : null].filter(Boolean).join(" · ")}</Text>
            </View>
          </View>
        ) : null}

        {t.segments.length ? (
          <View style={styles.block}>
            <Text style={styles.blockTitle}>{t.returnSegments.length ? "Outbound" : "Flight"}</Text>
            {t.segments.map((s, i) => (
              <Leg key={`o${i}`} s={s} />
            ))}
          </View>
        ) : null}
        {t.returnSegments.length ? (
          <View style={styles.block}>
            <Text style={styles.blockTitle}>Return</Text>
            {t.returnSegments.map((s, i) => (
              <Leg key={`r${i}`} s={s} />
            ))}
          </View>
        ) : null}

        <View style={styles.paid}>
          {t.baseMinor != null && t.taxesMinor != null ? (
            <>
              <View style={styles.paidRow}>
                <Text style={styles.paidSub}>Fare</Text>
                <Text style={styles.paidSub}>{formatMinor(t.baseMinor, t.currency)}</Text>
              </View>
              <View style={styles.paidRow}>
                <Text style={styles.paidSub}>Taxes & fees</Text>
                <Text style={styles.paidSub}>{formatMinor(t.taxesMinor, t.currency)}</Text>
              </View>
            </>
          ) : null}
          <View style={styles.paidRow}>
            <Text style={styles.paidLabel}>Total paid</Text>
            <Text style={styles.paidValue}>{formatMinor(t.totalMinor, t.currency)}</Text>
          </View>
        </View>
      </View>
      <TicketDocActions
        title={t.demo ? "Demo e-ticket" : "E-ticket"}
        fileName={`FlightOne-eTicket-${t.pnr ?? booking.id.slice(-8).toUpperCase()}`}
        html={flightTicketHtml(t, { bookingRef: booking.id.slice(-8).toUpperCase() })}
      />
      <Actions share={share} />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.8 },

  booked: { alignItems: "center", gap: 6, paddingVertical: space.sm },
  check: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.xs,
    shadowColor: colors.success,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  bookedTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
  bookedBody: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.inkSoft, textAlign: "center", maxWidth: 320 },

  ticket: {
    backgroundColor: colors.card,
    borderRadius: radius.md + 8,
    padding: space.lg,
    gap: space.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    ...shadow,
    shadowOpacity: 0.07,
  },
  ticketHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eyebrow: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", color: colors.inkSoft },
  okTag: { backgroundColor: colors.successSoft, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3 },
  okTagText: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.success },
  demoTag: { backgroundColor: "#fdf1dc" },
  demoTagText: { color: "#8a5a00" },

  codes: { flexDirection: "row", gap: space.sm },
  code: { flex: 1, backgroundColor: colors.bg, borderRadius: radius.md, padding: space.md, gap: 4 },
  codeLabel: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase", color: colors.inkFaint },
  codeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  codeValue: { flex: 1, fontFamily: fonts.display, fontSize: 17, color: colors.ink, letterSpacing: 0.5 },

  infoRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.accent },
  infoTitle: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.ink },
  infoSub: { fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft },

  block: { gap: space.md },
  blockTitle: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: colors.inkFaint },
  leg: { flexDirection: "row", gap: space.md },
  rail: { width: 12, alignItems: "center", paddingVertical: 6 },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: colors.accent, backgroundColor: colors.card },
  dotEnd: { backgroundColor: colors.accent },
  railLine: { flex: 1, width: 2, backgroundColor: colors.accentSoft, marginVertical: 2 },
  legBody: { flex: 1, gap: 8 },
  legRow: { flexDirection: "row", alignItems: "baseline", gap: space.sm },
  legTime: { fontFamily: fonts.display, fontSize: 17, color: colors.ink, minWidth: 52 },
  legCode: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.ink },
  legDate: { fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft, marginLeft: "auto" },
  legNext: { fontFamily: fonts.bodySemi, fontSize: 12, color: "#8a5a00", marginLeft: "auto" },
  legMid: { flexDirection: "row", alignItems: "center", gap: 6, paddingLeft: 60 },
  legMidText: { fontFamily: fonts.body, fontSize: 12, color: colors.inkSoft, flexShrink: 1 },

  paid: { gap: 6, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  paidRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  paidSub: { fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft },
  paidLabel: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.ink },
  paidValue: { fontFamily: fonts.display, fontSize: 20, color: colors.ink },

  actions: { gap: space.sm, paddingBottom: space.lg },
  doc: {
    backgroundColor: colors.card,
    borderRadius: radius.md + 6,
    padding: space.lg,
    gap: space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    ...shadow,
    shadowOpacity: 0.06,
  },
  docHead: { flexDirection: "row", alignItems: "center", gap: space.md },
  docIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" },
  docTitle: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.ink },
  docSub: { fontFamily: fonts.body, fontSize: 12, color: colors.inkSoft },
  docError: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.danger },
  iconBtn: { width: 50, height: 50, borderRadius: 25, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", backgroundColor: colors.card },
  actionRow: { flexDirection: "row", gap: space.sm },
  primary: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm, minHeight: 50, borderRadius: radius.pill, backgroundColor: colors.btn },
  primaryText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.onBtn },
  secondary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 50,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  secondaryText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.ink },
  link: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 40 },
  linkText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.accent },
});
