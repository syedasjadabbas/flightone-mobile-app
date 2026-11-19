import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Stack, useLocalSearchParams } from "expo-router";
import { Button, Card, Notice, Screen } from "@/core/components";
import { formatApiError } from "@/core/api/formatApiError";
import { useAuthStore } from "@/core/auth/auth.store";
import { colors, fonts, radius, space, type } from "@/core/theme/tokens";
import {
  useAcceptPriceChangeMutation,
  useGetBookingQuery,
  useMyCompanionsQuery,
  useMyProfileQuery,
  usePayBookingMutation,
  useReserveBookingMutation,
  useTicketBookingMutation,
} from "../api/bookingsApi";
import { useApprovalGateQuery } from "@/features/corporate/api/corporateApi";
import { useCorporateProfileStore } from "@/features/corporate/store/corporateProfile.store";
import { CorporateGate } from "../components/CorporateGate";
import { RewardsCredit } from "../components/RewardsCredit";
import type { PayMethod } from "../api/types";
import { formatMinor, isBookingTicketed, parsePriceChangedError, type PriceChangedDetails } from "../lib/checkoutDisplay";
import { emptyHotelGuests, hotelStayOf, hotelTravellerSnapshot, validateHotelGuests, type HotelGuestsForm as HotelForm } from "../lib/hotelStay";
import {
  buildTravellerSnapshot,
  missingTravellerMessage,
  resolveCompanionTraveller,
  resolvePrimaryTraveller,
  validateTravellerFormData,
  type TravellerFormData,
} from "../lib/travellerAutoFill";
import { BookingSummary } from "../components/BookingSummary";
import { HotelGuestsForm } from "../components/HotelGuestsForm";
import { PaymentSection, availableMethods } from "../components/PaymentSection";
import { TicketView } from "../components/TicketView";
import { TravellerForm } from "../components/TravellerForm";

const EMPTY_TRAVELLER: TravellerFormData = {
  givenName: "",
  surname: "",
  nationality: "",
  dateOfBirth: "",
  passportNumber: "",
  passportExpiry: "",
  phone: "",
  email: "",
  companionId: null,
};

/**
 * Checkout for one booking. Same flow as the web's CheckoutClient:
 *   QUOTED   → traveller/guest details → pay → reserve → ticket (when the supplier can)
 *   RESERVED → seat held: bank-transfer details, or ticket once paid
 *   TICKETED → e-ticket / hotel confirmation
 * A PRICE_CHANGED error from the server pauses checkout until the traveller accepts.
 */
export function CheckoutScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const user = useAuthStore((s) => s.user);
  const { data: booking, isLoading, error, refetch } = useGetBookingQuery(bookingId, { skip: !bookingId });
  const { data: profile, isLoading: profileLoading } = useMyProfileQuery();
  const { data: companions = [] } = useMyCompanionsQuery();
  const { data: gate, refetch: refetchGate } = useApprovalGateQuery(bookingId, { skip: !bookingId });
  const corporateMode = useCorporateProfileStore((s) => s.mode === "CORPORATE");

  const [pay] = usePayBookingMutation();
  const [reserve] = useReserveBookingMutation();
  const [ticket] = useTicketBookingMutation();
  const [acceptPrice, acceptState] = useAcceptPriceChangeMutation();

  const [traveller, setTraveller] = useState<TravellerFormData>(EMPTY_TRAVELLER);
  const [autoFilled, setAutoFilled] = useState(false);
  const [hotelForm, setHotelForm] = useState<HotelForm | null>(null);
  const [method, setMethod] = useState<PayMethod>("card");
  const [cardToken, setCardToken] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [busy, setBusy] = useState<null | "pay" | "hold" | "ticket">(null);
  const [message, setMessage] = useState<string | null>(null);
  const [priceChange, setPriceChange] = useState<PriceChangedDetails | null>(null);

  const stay = booking ? hotelStayOf(booking) : null;

  // Prefill once from the profile (and the signed-in user) — same as web.
  useEffect(() => {
    if (autoFilled || profileLoading) return;
    const primary = resolvePrimaryTraveller(profile as never, null, user);
    setTraveller((prev) => ({ ...primary, title: prev.title, gender: prev.gender }));
    setAutoFilled(true);
  }, [autoFilled, profileLoading, profile, user]);

  useEffect(() => {
    if (stay && !hotelForm) setHotelForm(emptyHotelGuests(stay, traveller));
  }, [stay, hotelForm, traveller]);

  useEffect(() => {
    if (!booking) return;
    const methods = availableMethods(booking, corporateMode);
    if (!methods.includes(method)) setMethod(methods[0] ?? "card");
  }, [booking, method, corporateMode]);

  const payableMinor = useMemo(() => {
    if (!booking) return 0;
    const credit = Number((booking.metadata as { rewardCredit?: { creditMinor?: number } } | null)?.rewardCredit?.creditMinor ?? 0);
    return Math.max(0, booking.amountMinor - (credit > 0 ? credit : 0));
  }, [booking]);

  if (isLoading || !bookingId) {
    return (
      <Screen>
        <ActivityIndicator color={colors.accent} />
      </Screen>
    );
  }
  if (error || !booking) {
    return (
      <Screen>
        <Notice message={formatApiError(error, "Booking not found")} />
        <Button label="Retry" variant="ghost" onPress={() => refetch()} />
      </Screen>
    );
  }

  const supplierCap = booking.supplierCapability;
  const payCap = booking.paymentCapability;
  const ticketed = isBookingTicketed(booking.status);
  const isQuoted = booking.status === "QUOTED";
  const hasPaid = Boolean(booking.payments?.some((p) => p.status === "CAPTURED" || p.status === "AUTHORIZED"));
  const pending = booking.payments?.find((p) => p.status === "PENDING");
  const pendingTransfer = pending?.metadata?.consumerNumber ? pending.metadata : null;
  /** Company bookings can't be paid until approved (same rule as web). */
  const corporateBlocked = Boolean(gate?.corporate && !gate.canProceed);

  /** Returns true when the error was a price change (handled by the alert). */
  const handleError = (err: unknown) => {
    const changed = parsePriceChangedError(err);
    if (changed) {
      setPriceChange(changed);
      setMessage(null);
      return;
    }
    setMessage(formatApiError(err));
  };

  const validateDetails = (): string | null => {
    if (stay && hotelForm) return validateHotelGuests(hotelForm, stay);
    const v = validateTravellerFormData(traveller);
    return v.isValid ? null : missingTravellerMessage(v.missingFields);
  };

  const travellerSnapshot = () =>
    stay && hotelForm ? hotelTravellerSnapshot(hotelForm) : buildTravellerSnapshot(traveller);

  async function onPay() {
    setMessage(null);
    if (priceChange) return setMessage("Accept the updated price before continuing.");
    if (corporateBlocked) return setMessage("This company booking needs approval before payment.");
    if (isQuoted) {
      const problem = validateDetails();
      if (problem) return setMessage(problem);
    }
    if (method === "card" && payCap?.mode !== "simulated") {
      return setMessage(payCap?.reasons?.join("; ") || "Card payments aren't available yet.");
    }
    if (method === "card" && !cardToken.trim()) return setMessage("Enter a test card token (development only).");
    if ((method === "jazzcash" || method === "easypaisa") && !/^03\d{9}$/.test(accountNumber.trim())) {
      return setMessage("Enter your mobile account number (03XXXXXXXXX).");
    }

    setBusy("pay");
    try {
      const payment = await pay({
        id: booking!.id,
        method,
        paymentMethodToken: method === "card" ? cardToken.trim() : undefined,
        accountNumber: method === "jazzcash" || method === "easypaisa" ? accountNumber.trim() : undefined,
      }).unwrap();

      if (isQuoted) {
        await reserve({ id: booking!.id, clientAmountMinor: booking!.amountMinor, travellerSnapshot: travellerSnapshot() }).unwrap();
        if (supplierCap?.canTicket && payment.status !== "PENDING") {
          try {
            await ticket({ id: booking!.id, clientAmountMinor: booking!.amountMinor }).unwrap();
          } catch (ticketErr) {
            // Paid and seat held; ops is alerted — but the traveller must be told.
            handleError(ticketErr);
          }
        }
      }
      await refetch();
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(null);
    }
  }

  /** Hold the seat without paying now: always a 1Link bank-transfer reference (same as web). */
  async function onHold() {
    setMessage(null);
    if (priceChange) return setMessage("Accept the updated price before continuing.");
    const problem = validateDetails();
    if (problem) return setMessage(problem);
    if (!supplierCap?.canReserve) return setMessage(supplierCap?.reasons?.join("; ") || "Holding this fare isn't available.");

    setBusy("hold");
    try {
      if (!hasPaid && !pending) await pay({ id: booking!.id, method: "onelink_ibft" }).unwrap();
      await reserve({ id: booking!.id, clientAmountMinor: booking!.amountMinor, travellerSnapshot: travellerSnapshot() }).unwrap();
      await refetch();
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(null);
    }
  }

  async function onTicket() {
    setMessage(null);
    if (!supplierCap?.canTicket) {
      return setMessage(supplierCap?.reasons?.join("; ") || "Ticketing is unavailable for this fare right now.");
    }
    setBusy("ticket");
    try {
      await ticket({ id: booking!.id, clientAmountMinor: booking!.amountMinor }).unwrap();
      await refetch();
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(null);
    }
  }

  async function onAcceptPrice() {
    if (!priceChange) return;
    try {
      await acceptPrice({ id: booking!.id, acceptedAmountMinor: priceChange.newAmountMinor }).unwrap();
      setPriceChange(null);
      await refetch();
    } catch (err) {
      handleError(err);
    }
  }

  const title = ticketed
    ? "Your booking"
    : isQuoted
      ? stay
        ? "Guest details"
        : "Traveller details"
      : booking.status === "RESERVED"
        ? "Complete your booking"
        : "Booking";

  return (
    <Screen
      edges={["left", "right", "bottom"]}
      footer={
        isQuoted ? (
          <View style={styles.payBar}>
            <View style={styles.payRow}>
              <View style={styles.flex}>
                <Text style={styles.payLabel}>Total to pay</Text>
                <Text style={styles.payAmount}>{formatMinor(payableMinor, booking.currency)}</Text>
              </View>
              <Button
                label="Pay now"
                onPress={onPay}
                loading={busy === "pay"}
                disabled={Boolean(busy) || Boolean(priceChange) || corporateBlocked}
                style={styles.payBtn}
              />
            </View>
            {!stay && supplierCap?.canReserve ? (
              <Pressable
                accessibilityRole="button"
                disabled={Boolean(busy) || Boolean(priceChange)}
                onPress={onHold}
                style={({ pressed }) => [styles.holdLink, pressed && styles.pressed]}
              >
                {busy === "hold" ? <ActivityIndicator size="small" color={colors.accent} /> : <Ionicons name="time-outline" size={15} color={colors.accent} />}
                <Text style={styles.holdText}>Hold seat, pay by bank transfer</Text>
              </Pressable>
            ) : null}
            <View style={styles.secure}>
              <Ionicons name="lock-closed" size={11} color={colors.inkFaint} />
              <Text style={styles.secureText}>Secure payment · price confirmed by FlightOne</Text>
            </View>
          </View>
        ) : undefined
      }
    >
      <Stack.Screen options={{ title }} />
      <Steps current={ticketed ? 2 : booking.status === "RESERVED" ? 1 : 0} />
      <BookingSummary booking={booking} stay={stay} payableMinor={payableMinor} />

      {priceChange ? (
        <Card style={styles.alert}>
          <Text style={type.h3}>The price changed</Text>
          <Text style={type.body}>
            {formatMinor(priceChange.previousAmountMinor, priceChange.currency)} →{" "}
            <Text style={styles.strong}>{formatMinor(priceChange.newAmountMinor, priceChange.currency)}</Text>
          </Text>
          {priceChange.reason ? <Text style={type.bodySoft}>{priceChange.reason}</Text> : null}
          <Button label="Accept new price" onPress={onAcceptPrice} loading={acceptState.isLoading} />
        </Card>
      ) : null}

      {ticketed ? <TicketView booking={booking} stay={stay} /> : null}

      {gate?.corporate && !ticketed ? (
        <CorporateGate
          bookingId={booking.id}
          gate={gate}
          onChange={() => {
            refetchGate();
            refetch();
          }}
        />
      ) : null}

      {isQuoted ? (
        <>
          {stay && hotelForm ? (
            <HotelGuestsForm stay={stay} value={hotelForm} onChange={setHotelForm} disabled={Boolean(busy)} />
          ) : !stay ? (
            <TravellerForm
              value={traveller}
              onChange={setTraveller}
              companions={companions}
              onPickPrimary={() =>
                setTraveller((prev) => ({ ...resolvePrimaryTraveller(profile as never, null, user), title: prev.title, gender: prev.gender }))
              }
              onPickCompanion={(c) =>
                setTraveller((prev) => ({ ...resolveCompanionTraveller(c as never, null), title: prev.title, gender: prev.gender }))
              }
              disabled={Boolean(busy)}
            />
          ) : (
            <Notice message="This hotel booking is missing its stay details. Please search again." />
          )}
          <RewardsCredit booking={booking} onApplied={() => refetch()} />
          <PaymentSection
            booking={booking}
            method={method}
            setMethod={setMethod}
            cardToken={cardToken}
            setCardToken={setCardToken}
            accountNumber={accountNumber}
            setAccountNumber={setAccountNumber}
            disabled={Boolean(busy)}
            corporate={corporateMode}
          />
        </>
      ) : null}

      {booking.status === "RESERVED" ? (
        <Card>
          <Text style={type.h3}>{hasPaid ? "Paid — issuing your ticket" : "Seat held"}</Text>
          {booking.reservedUntil ? (
            <Text style={type.bodySoft}>Held until {new Date(booking.reservedUntil).toLocaleString()}</Text>
          ) : null}
          {pendingTransfer ? (
            <View style={styles.transfer}>
              <Text style={type.label}>Complete this bank transfer</Text>
              <Text style={type.bodySoft}>1Bill consumer number</Text>
              <Text style={styles.big} selectable>
                {String(pendingTransfer.consumerNumber)}
              </Text>
              {pendingTransfer.bankName ? <Text style={type.body}>Bank: {String(pendingTransfer.bankName)}</Text> : null}
              {pendingTransfer.accountTitle ? <Text style={type.body}>Account: {String(pendingTransfer.accountTitle)}</Text> : null}
              {pendingTransfer.iban ? (
                <Text style={type.body} selectable>
                  IBAN: {String(pendingTransfer.iban)}
                </Text>
              ) : null}
              <Text style={type.bodySoft}>Your ticket is issued automatically once the bank confirms the transfer.</Text>
            </View>
          ) : null}
          {hasPaid && supplierCap?.canTicket ? (
            <Button label="Issue ticket" onPress={onTicket} loading={busy === "ticket"} />
          ) : null}
          <Button label="Refresh status" variant="ghost" onPress={() => refetch()} />
        </Card>
      ) : null}

      {booking.status === "CANCELLED" || booking.status === "REFUNDED" ? (
        <Notice tone="info" message={`This booking is ${booking.status.toLowerCase()}.`} />
      ) : null}

      {message ? <Notice message={message} /> : null}

    </Screen>
  );
}

const STEPS = ["Traveller", "Payment", "Ticket"];

/** Where you are in checkout: Traveller → Payment → Ticket. */
function Steps({ current }: { current: number }) {
  return (
    <View style={styles.steps} accessibilityRole="progressbar" accessibilityLabel={`Step ${current + 1} of 3: ${STEPS[current]}`}>
      {STEPS.map((label, i) => {
        const done = i < current;
        const now = i === current;
        return (
          <View key={label} style={styles.step}>
            {i > 0 ? <View style={[styles.stepLine, (done || now) && styles.stepLineOn]} /> : null}
            <View style={[styles.stepDot, done && styles.stepDotDone, now && styles.stepDotNow]}>
              {done ? <Ionicons name="checkmark" size={12} color="#fff" /> : <Text style={[styles.stepNum, now && styles.stepNumNow]}>{i + 1}</Text>}
            </View>
            <Text style={[styles.stepLabel, (done || now) && styles.stepLabelOn]}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.8 },
  steps: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 0 },
  step: { flexDirection: "row", alignItems: "center", gap: 6 },
  stepLine: { width: 28, height: 2, borderRadius: 1, backgroundColor: colors.line, marginHorizontal: 6 },
  stepLineOn: { backgroundColor: colors.accent },
  stepDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.line, alignItems: "center", justifyContent: "center", backgroundColor: colors.card },
  stepDotDone: { backgroundColor: colors.success, borderColor: colors.success },
  stepDotNow: { borderColor: colors.accent, backgroundColor: colors.accent },
  stepNum: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.inkFaint },
  stepNumNow: { color: "#fff" },
  stepLabel: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.inkFaint },
  stepLabelOn: { color: colors.ink },
  payBar: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.sm,
    gap: space.sm,
    shadowColor: "#0b1219",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  payRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  payLabel: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.inkSoft },
  payAmount: { fontFamily: fonts.display, fontSize: 20, color: colors.ink },
  payBtn: { minWidth: 140 },
  holdLink: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 36, borderRadius: radius.pill },
  holdText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.accent },
  secure: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
  secureText: { fontFamily: fonts.body, fontSize: 11, color: colors.inkFaint },
  alert: { borderColor: colors.accent, borderWidth: 1 },
  strong: { fontFamily: fonts.bodyBold },
  transfer: { gap: 4, backgroundColor: colors.accentSoft, borderRadius: 10, padding: space.md },
  big: { fontFamily: fonts.display, fontSize: 22, color: colors.ink, letterSpacing: 1 },
});
