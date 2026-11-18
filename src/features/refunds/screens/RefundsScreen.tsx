import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Button, Card, Notice, Screen, Tag, TextField } from "@/core/components";
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
  type RefundCase,
} from "../api/refundsApi";
import { CaseProgressBar } from "../components/CaseProgressBar";
import { ELIGIBILITY_LABEL, STATUS_LABEL, bookingWhat, bookingWhen, refundHint } from "../lib/bookingLabels";
import { kindLabel } from "../lib/refundFormat";
import { statusHeadline } from "../lib/caseStatus";

/** Refunds & changes: pick a booking → see eligibility → request a refund or cancellation. */
export function RefundsScreen() {
  const params = useLocalSearchParams<{ bookingId?: string }>();
  const { data: bookings, isLoading } = useRefundableBookingsQuery();
  const { data: cases, error: casesError, refetch: refetchCases } = useRefundCasesQuery();
  const [selected, setSelected] = useState<string | null>(params.bookingId ?? null);

  useEffect(() => {
    if (params.bookingId) setSelected(params.bookingId);
  }, [params.bookingId]);

  const items = bookings?.items ?? [];

  return (
    <Screen edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: "Refunds & changes" }} />
      <Card>
        <Text style={type.h3}>1. Choose a booking</Text>
        {isLoading ? <ActivityIndicator color={colors.accent} /> : null}
        {!isLoading && !items.length ? <Text style={type.bodySoft}>No bookings that can be refunded or cancelled right now.</Text> : null}
        {items.map((b) => (
          <Pressable
            key={b.bookingId}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected === b.bookingId }}
            accessibilityLabel={bookingWhat(b)}
            onPress={() => setSelected(b.bookingId)}
            style={[styles.option, selected === b.bookingId && styles.optionOn]}
          >
            <View style={styles.optionHead}>
              <Text style={type.label}>{bookingWhat(b)}</Text>
              <Tag label={ELIGIBILITY_LABEL[b.eligibilityStatus] ?? b.eligibilityStatus.toLowerCase()} tone={b.eligible ? "success" : "neutral"} />
            </View>
            <Text style={type.bodySoft}>
              {[bookingWhen(b), STATUS_LABEL[b.status] ?? b.status, b.trip?.reference].filter(Boolean).join(" · ")}
            </Text>
            <Text style={type.bodySoft}>{refundHint(b)}</Text>
          </Pressable>
        ))}
      </Card>

      {selected ? <ActionPanel bookingId={selected} onDone={() => refetchCases()} /> : null}

      <Card>
        <Text style={type.h3}>Your refund cases</Text>
        {casesError ? <Notice message={formatApiError(casesError)} /> : null}
        {cases?.items.length ? (
          cases.items.map((c) => <CaseRow key={c.id} c={c} />)
        ) : (
          <Text style={type.bodySoft}>No refund cases on file.</Text>
        )}
      </Card>
    </Screen>
  );
}

function CaseRow({ c }: { c: RefundCase }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${kindLabel(c.kind)} case, ${statusHeadline(c.status)}`}
      onPress={() => router.push({ pathname: "/refunds/[id]", params: { id: c.id } })}
      style={styles.case}
    >
      <View style={styles.optionHead}>
        <Text style={type.label}>
          {kindLabel(c.kind)} · #{c.id.slice(-8).toUpperCase()}
        </Text>
        <Tag label={statusHeadline(c.status)} tone={c.status === "COMPLETED" ? "success" : "accent"} />
      </View>
      <CaseProgressBar status={c.status} />
      <Text style={type.bodySoft}>Submitted {new Date(c.createdAt).toLocaleDateString()}</Text>
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

  if (isFetching && !elig) return <ActivityIndicator color={colors.accent} />;
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
      onDone();
    } catch (err) {
      setMessage({ tone: "error", text: formatApiError(err) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <View style={styles.optionHead}>
        <Text style={type.h3}>2. Your options</Text>
        <Tag label={elig.eligible ? "Eligible" : "Restricted"} tone={elig.eligible ? "success" : "neutral"} />
      </View>
      {confirmed && preview?.refundableMinor != null ? (
        <View style={styles.figure}>
          <Text style={type.bodySoft}>Net refundable (confirmed)</Text>
          <Text style={styles.amount}>{formatMinor(preview.refundableMinor, currency)}</Text>
          {preview.supplierPenaltyMinor ? <Text style={type.bodySoft}>Airline/hotel penalty {formatMinor(preview.supplierPenaltyMinor, currency)}</Text> : null}
          {preview.agencyFeeMinor ? <Text style={type.bodySoft}>Service fee {formatMinor(preview.agencyFeeMinor, currency)}</Text> : null}
          {preview.travelCreditMinor ? <Text style={type.bodySoft}>Travel credit {formatMinor(preview.travelCreditMinor, currency)}</Text> : null}
        </View>
      ) : (
        <Text style={type.body}>The refundable amount is confirmed by an agent for this booking.</Text>
      )}
      {preview?.processingTimelineNote ? <Text style={type.bodySoft}>{preview.processingTimelineNote}</Text> : null}
      {elig.reason ? <Text style={type.bodySoft}>{elig.reason}</Text> : null}
      <TextField label="Reason (optional)" value={reason} onChangeText={setReason} maxLength={500} />
      {message ? <Notice tone={message.tone} message={message.text} /> : null}
      <Button label="Request refund" onPress={onRefund} loading={busy === "refund"} disabled={Boolean(busy) || !elig.eligible} />
      <Button label="Request cancellation" variant="ghost" onPress={onCancel} loading={busy === "cancel"} disabled={Boolean(busy)} />
    </Card>
  );
}

const styles = StyleSheet.create({
  option: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, padding: space.md, gap: 4 },
  optionOn: { borderColor: colors.accent, borderWidth: 2, backgroundColor: colors.accentSoft },
  optionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: space.sm },
  case: { gap: space.sm, paddingVertical: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  figure: { gap: 2 },
  amount: { fontFamily: fonts.display, fontSize: 24, color: colors.ink },
});
