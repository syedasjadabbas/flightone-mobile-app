import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { Button, Card, EmptyState, Notice, PageHeader, Screen, Segmented, SectionLabel, TextField } from "@/core/components";
import { formatApiError } from "@/core/api/formatApiError";
import { confirmAction } from "@/core/lib/confirm";
import { colors, fonts, radius, space, type } from "@/core/theme/tokens";
import { formatMinor } from "@/features/checkout/lib/checkoutDisplay";
import {
  useCalculateRefundMutation,
  useCreateRefundCaseMutation,
  useRefundableBookingsQuery,
  useRefundCasesQuery,
  useRefundEligibilityQuery,
  useRequestCancellationMutation,
  useSubmitRefundCaseMutation,
  type RefundableBooking,
} from "../api/refundsApi";
import { AmountRow, CaseRow, StepHead, TintTag, isClosed } from "../components/RefundParts";
import { ELIGIBILITY_LABEL, STATUS_LABEL, bookingWhat, bookingWhen, refundHint } from "../lib/bookingLabels";

type CaseView = "open" | "closed";

/** Refunds & changes: pick a booking → see eligibility → request a refund or cancellation. */
export function RefundsScreen() {
  const params = useLocalSearchParams<{ bookingId?: string }>();
  const { data: bookings, isLoading } = useRefundableBookingsQuery();
  const { data: cases, error: casesError, refetch: refetchCases } = useRefundCasesQuery();
  const [selected, setSelected] = useState<string | null>(params.bookingId ?? null);
  const [picking, setPicking] = useState(!params.bookingId);
  const [view, setView] = useState<CaseView>("open");
  // The request flow stays folded behind one button until you need it (or arrive from a trip).
  const [starting, setStarting] = useState(Boolean(params.bookingId));
  const [showAll, setShowAll] = useState(false);

  // Follow a new ?bookingId= (e.g. "Refund" tapped on a trip) without an effect.
  const [seenParam, setSeenParam] = useState(params.bookingId);
  if (params.bookingId !== seenParam) {
    setSeenParam(params.bookingId);
    if (params.bookingId) {
      setSelected(params.bookingId);
      setPicking(false);
      setStarting(true);
    }
  }

  // Bookings you can act on first; the rest stay reachable under "Show all".
  const items = useMemo(() => [...(bookings?.items ?? [])].sort((a, b) => Number(b.eligible) - Number(a.eligible)), [bookings]);
  const PREVIEW = 3;
  const allCases = useMemo(() => cases?.items ?? [], [cases]);
  const openCases = allCases.filter((c) => !isClosed(c.status));
  const closedCases = allCases.filter((c) => isClosed(c.status));
  const shown = view === "open" ? openCases : closedCases;
  const refundable = items.filter((b) => b.eligible).length;
  const chosen = items.find((b) => b.bookingId === selected);
  const showList = picking || !chosen;

  const choose = (id: string) => {
    void Haptics.selectionAsync().catch(() => {});
    setSelected(id);
    setPicking(false);
  };

  return (
    <Screen edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: "Refunds & changes" }} />
      <PageHeader
        icon="receipt-outline"
        tint="rose"
        subtitle="Cancel a booking or claim a refund, then follow every step here."
        stats={[
          { value: openCases.length, label: "Open cases" },
          { value: allCases.filter((c) => c.status === "COMPLETED").length, label: "Refunded" },
          { value: isLoading ? "–" : refundable, label: "Refundable trips" },
        ]}
      />

      {!starting ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void Haptics.selectionAsync().catch(() => {});
            setStarting(true);
          }}
          style={({ pressed }) => [styles.startCard, pressed && styles.pressed]}
        >
          <View style={styles.startIcon}>
            <Ionicons name="add" size={22} color={colors.onBtn} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.startTitle}>Request a refund or cancellation</Text>
            <Text style={styles.startSub}>
              {isLoading ? "Checking your bookings…" : refundable ? `${refundable} of your trips can be refunded` : "See which trips can be changed"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
        </Pressable>
      ) : (
        <Card>
          <StepHead
            n={1}
            title="Choose a booking"
            done={!showList}
            right={
              !showList && items.length > 1 ? (
                <Pressable accessibilityRole="button" accessibilityLabel="Change booking" onPress={() => setPicking(true)} hitSlop={10}>
                  <Text style={styles.link}>Change</Text>
                </Pressable>
              ) : !chosen ? (
                <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => setStarting(false)} hitSlop={10}>
                  <Text style={styles.link}>Close</Text>
                </Pressable>
              ) : null
            }
          />
          {isLoading ? <ActivityIndicator color={colors.accent} /> : null}
          {!isLoading && !items.length ? (
            <View style={styles.inlineEmpty}>
              <Ionicons name="airplane-outline" size={18} color={colors.inkFaint} />
              <Text style={[type.bodySoft, styles.flex]}>No bookings can be refunded or cancelled right now.</Text>
            </View>
          ) : null}
          {showList || !chosen ? (
            <>
              {(showAll ? items : items.slice(0, PREVIEW)).map((b) => (
                <BookingOption key={b.bookingId} b={b} on={selected === b.bookingId} onPress={() => choose(b.bookingId)} />
              ))}
              {items.length > PREVIEW ? (
                <Pressable accessibilityRole="button" onPress={() => setShowAll((v) => !v)} hitSlop={8} style={styles.more}>
                  <Text style={styles.link}>{showAll ? "Show fewer" : `Show all ${items.length} bookings`}</Text>
                  <Ionicons name={showAll ? "chevron-up" : "chevron-down"} size={15} color={colors.accent} />
                </Pressable>
              ) : null}
            </>
          ) : (
            <BookingOption b={chosen} on onPress={() => setPicking(true)} />
          )}
        </Card>
      )}

      {starting && selected && !picking ? <ActionPanel bookingId={selected} onDone={() => refetchCases()} /> : null}

      <SectionLabel>Your refund cases</SectionLabel>
      {casesError ? <Notice message={formatApiError(casesError)} /> : null}
      {allCases.length ? (
        <>
          <Segmented<CaseView>
            options={[
              { value: "open", label: "In progress", count: openCases.length },
              { value: "closed", label: "Closed", count: closedCases.length },
            ]}
            value={view}
            onChange={setView}
          />
          {shown.length ? (
            <View style={styles.list}>
              {shown.map((c) => (
                <CaseRow key={c.id} c={c} />
              ))}
            </View>
          ) : (
            <EmptyState
              icon={view === "open" ? "checkmark-done-outline" : "archive-outline"}
              tint="rose"
              title={view === "open" ? "Nothing in progress" : "No closed cases yet"}
              body={view === "open" ? "All your refund requests are wrapped up." : "Finished refunds and cancellations will appear here."}
            />
          )}
        </>
      ) : !casesError ? (
        <EmptyState
          icon="receipt-outline"
          tint="rose"
          title="No refund cases yet"
          body="When you request a refund or cancellation, you can track its progress here."
        />
      ) : null}

    </Screen>
  );
}

function BookingOption({ b, on, onPress }: { b: RefundableBooking; on: boolean; onPress: () => void }) {
  const isStay = b.product === "HOTEL" || Boolean(b.trip?.hotelName);
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      accessibilityLabel={`${bookingWhat(b)}, ${refundHint(b)}`}
      onPress={onPress}
      style={({ pressed }) => [styles.option, on && styles.optionOn, pressed && styles.pressed]}
    >
      <View style={[styles.optIcon, on && styles.optIconOn]}>
        <Ionicons name={isStay ? "bed-outline" : "airplane-outline"} size={18} color={on ? colors.accent : colors.inkSoft} />
      </View>
      <View style={styles.optBody}>
        <Text style={styles.optTitle} numberOfLines={2}>
          {bookingWhat(b)}
        </Text>
        <Text style={styles.optMeta} numberOfLines={1}>
          {[bookingWhen(b), STATUS_LABEL[b.status] ?? b.status].filter(Boolean).join(" · ")}
        </Text>
        {on ? (
          <Text style={styles.optHint} numberOfLines={2}>
            {refundHint(b)}
          </Text>
        ) : null}
      </View>
      <View style={styles.optRight}>
        <TintTag
          label={ELIGIBILITY_LABEL[b.eligibilityStatus] ?? b.eligibilityStatus.toLowerCase()}
          tint={b.eligible ? "green" : b.eligibilityStatus === "NOT_ELIGIBLE" ? "slate" : "amber"}
        />
        <Ionicons name={on ? "radio-button-on" : "radio-button-off"} size={20} color={on ? colors.accent : colors.inkFaint} />
      </View>
    </Pressable>
  );
}

function ActionPanel({ bookingId, onDone }: { bookingId: string; onDone: () => void }) {
  const { data: elig, isFetching, error } = useRefundEligibilityQuery(bookingId);
  const [calculate] = useCalculateRefundMutation();
  const [createCase] = useCreateRefundCaseMutation();
  const [submit] = useSubmitRefundCaseMutation();
  const [cancel] = useRequestCancellationMutation();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<null | "refund" | "cancel">(null);
  const [message, setMessage] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);

  if (isFetching && !elig) {
    return (
      <Card>
        <StepHead n={2} title="Review your options" />
        <ActivityIndicator color={colors.accent} />
      </Card>
    );
  }
  if (error) return <Notice message={formatApiError(error)} />;
  if (!elig) return null;

  const preview = elig.calculationPreview;
  const confirmed = Boolean(preview?.confirmed && preview?.dataStatus === "OK");
  const currency = elig.currency ?? preview?.currency ?? "PKR";

  /** Same chain as web: calculate → create case (idempotent per booking) → submit. */
  const onRefund = async () => {
    if (!(await confirmAction("Request a refund?", "We'll check the fare rules and start your refund.", "Request refund"))) return;
    setBusy("refund");
    setMessage(null);
    try {
      const calc = await calculate({ bookingId, kind: "REFUND" }).unwrap();
      const c = await createCase({
        bookingId,
        calculationId: calc.id,
        reason: reason.trim() || undefined,
        idempotencyKey: `ui-refund:${bookingId}`,
      }).unwrap();
      const final = ["DRAFT", "QUOTED", "ELIGIBLE"].includes(c.status) ? await submit(c.id).unwrap() : c;
      setMessage({
        tone: "success",
        text:
          final.status === "COMPLETED"
            ? "Refund completed."
            : final.status === "REQUIRES_HUMAN"
              ? "Refund requested — an agent will confirm the amount."
              : "Refund requested. We'll update you as it progresses.",
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onDone();
    } catch (err) {
      setMessage({ tone: "error", text: formatApiError(err) });
    } finally {
      setBusy(null);
    }
  };

  const onCancel = async () => {
    if (!(await confirmAction("Cancel this booking?", "We'll calculate what's refundable and open a cancellation request.", "Request cancellation"))) return;
    setBusy("cancel");
    setMessage(null);
    try {
      const r = await cancel({ bookingId, reason: reason.trim() || undefined }).unwrap();
      setMessage({
        tone: "success",
        text: r.refundCase?.status === "REQUIRES_HUMAN" ? "Cancellation requested — an agent will confirm it." : "Cancellation requested.",
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onDone();
    } catch (err) {
      setMessage({ tone: "error", text: formatApiError(err) });
    } finally {
      setBusy(null);
    }
  };

  const hasBreakdown = Boolean(preview?.supplierPenaltyMinor || preview?.agencyFeeMinor || preview?.travelCreditMinor);

  return (
    <>
      <Card>
        <StepHead n={2} title="Review your options" right={<TintTag label={elig.eligible ? "Eligible" : "Restricted"} tint={elig.eligible ? "green" : "slate"} />} />
        {confirmed && preview?.refundableMinor != null ? (
          <View style={styles.hero}>
            <Text style={styles.heroLabel}>You get back</Text>
            <Text style={styles.heroAmount}>{formatMinor(preview.refundableMinor, currency)}</Text>
            <View style={styles.confirmedRow}>
              <Ionicons name="shield-checkmark" size={14} color={colors.success} />
              <Text style={styles.confirmedText}>Confirmed from fare rules</Text>
            </View>
          </View>
        ) : (
          <View style={[styles.hero, styles.heroPending]}>
            <Ionicons name="person-circle-outline" size={22} color="#b26a00" />
            <Text style={[type.body, styles.flex]}>An agent confirms the refundable amount for this booking.</Text>
          </View>
        )}
        {confirmed && hasBreakdown ? (
          <View>
            {preview?.supplierPenaltyMinor ? <AmountRow label="Airline/hotel penalty" value={`− ${formatMinor(preview.supplierPenaltyMinor, currency)}`} tone="minus" /> : null}
            {preview?.agencyFeeMinor ? <AmountRow label="Service fee" value={`− ${formatMinor(preview.agencyFeeMinor, currency)}`} tone="minus" /> : null}
            {preview?.travelCreditMinor ? <AmountRow label="Travel credit" value={formatMinor(preview.travelCreditMinor, currency)} /> : null}
          </View>
        ) : null}
        {preview?.processingTimelineNote ? (
          <View style={styles.noteRow}>
            <Ionicons name="time-outline" size={16} color={colors.inkSoft} />
            <Text style={[type.bodySoft, styles.flex]}>{preview.processingTimelineNote}</Text>
          </View>
        ) : null}
        {elig.reason ? (
          <View style={styles.noteRow}>
            <Ionicons name="information-circle-outline" size={16} color={colors.inkSoft} />
            <Text style={[type.bodySoft, styles.flex]}>{elig.reason}</Text>
          </View>
        ) : null}
      </Card>

      <Card>
        <StepHead n={3} title="Send your request" />
        <TextField
          label="Reason (optional)"
          value={reason}
          onChangeText={setReason}
          maxLength={500}
          multiline
          placeholder="e.g. Change of plans, schedule change…"
          style={styles.textarea}
        />
        {message ? <Notice tone={message.tone} message={message.text} /> : null}
        <Button label="Request refund" onPress={onRefund} loading={busy === "refund"} disabled={Boolean(busy) || !elig.eligible} />
        <Button label="Request cancellation" variant="ghost" onPress={onCancel} loading={busy === "cancel"} disabled={Boolean(busy)} />
        <Text style={styles.fine}>{"You'll be asked to confirm before anything is sent."}</Text>
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { gap: space.sm },
  link: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.accent },
  pressed: { opacity: 0.85 },
  inlineEmpty: { flexDirection: "row", alignItems: "center", gap: space.sm, backgroundColor: colors.bg, borderRadius: radius.sm, padding: space.md },

  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: space.md,
  },
  optionOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  optIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  optIconOn: { backgroundColor: colors.card },
  optBody: { flex: 1, gap: 3 },
  optTitle: { fontFamily: fonts.displaySemi, fontSize: 15, color: colors.ink },
  optMeta: { fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft },
  optFoot: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: 2 },
  optHint: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.inkSoft, marginTop: 2 },
  optRight: { alignItems: "flex-end", gap: 6 },
  more: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, minHeight: 36 },
  startCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: space.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  startIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.danger, alignItems: "center", justifyContent: "center" },
  startTitle: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.ink },
  startSub: { fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft, marginTop: 1 },

  hero: { backgroundColor: colors.successSoft, borderRadius: radius.md, padding: space.lg, gap: 4, alignItems: "flex-start" },
  heroPending: { backgroundColor: "#fdf1dc", flexDirection: "row", alignItems: "center", gap: space.md },
  heroLabel: { fontFamily: fonts.bodySemi, fontSize: 12, letterSpacing: 0.6, textTransform: "uppercase", color: colors.success },
  heroAmount: { fontFamily: fonts.display, fontSize: 30, color: colors.ink },
  confirmedRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  confirmedText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.success },
  noteRow: { flexDirection: "row", gap: space.sm, alignItems: "flex-start" },
  textarea: { minHeight: 84, textAlignVertical: "top", paddingTop: space.md },
  fine: { fontFamily: fonts.body, fontSize: 12, color: colors.inkFaint, textAlign: "center" },
});
