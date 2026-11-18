import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Button, Card, ListRow, Notice, Screen } from "@/core/components";
import { formatApiError } from "@/core/api/formatApiError";
import { colors, fonts, radius, space, type } from "@/core/theme/tokens";
import { formatMinor } from "@/features/checkout/lib/checkoutDisplay";
import { useRefundCaseQuery } from "../api/refundsApi";
import { CaseProgressBar } from "../components/CaseProgressBar";
import { AmountRow, StatusTag, Timeline, caseRef, statusLook } from "../components/RefundParts";
import { labelize, statusCopy } from "../lib/caseStatus";
import { kindLabel } from "../lib/refundFormat";

function Detail({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <View style={styles.detail}>
      <Ionicons name={icon} size={16} color={colors.inkFaint} style={styles.detailIcon} />
      <View style={styles.flex}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

function sentence(s: string) {
  const l = labelize(s).toLowerCase();
  return l.charAt(0).toUpperCase() + l.slice(1);
}

export function RefundCaseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: c, isLoading, error, refetch } = useRefundCaseQuery(id, { skip: !id });

  if (isLoading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.accent} />
      </Screen>
    );
  }
  if (error || !c) {
    const notFound = (error as { status?: number })?.status === 404;
    return (
      <Screen>
        <Notice message={notFound ? "Case not found." : formatApiError(error, "Case unavailable.")} />
        {!notFound ? <Button label="Retry" variant="ghost" onPress={() => refetch()} /> : null}
      </Screen>
    );
  }

  const calc = c.calculation;
  const ref = caseRef(c.id);
  const look = statusLook(c.status);
  const kind = kindLabel(c.kind);
  const history = [...(c.audit ?? [])].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const lastIndex = history.length - 1;

  return (
    <Screen edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: `${kindLabel(c.kind)} case` }} />

      <Card>
        <View style={styles.topRow}>
          <StatusTag status={c.status} />
          <Text style={styles.ref}>#{ref}</Text>
        </View>
        {calc ? (
          <View style={styles.hero}>
            <Text style={styles.heroLabel}>{c.status === "COMPLETED" ? "Refunded" : "Refundable"}</Text>
            <Text style={styles.heroAmount}>{formatMinor(calc.refundableMinor, calc.currency)}</Text>
          </View>
        ) : (
          <Text style={type.h2}>{sentence(kind)} request</Text>
        )}
        <CaseProgressBar status={c.status} />
        <View style={styles.copyRow}>
          <Ionicons name="information-circle-outline" size={16} color={colors.inkSoft} style={styles.detailIcon} />
          <Text style={[type.bodySoft, styles.flex]}>{statusCopy(c.status)}</Text>
        </View>
        {c.paymentRefundStatus ? (
          <View style={styles.payment}>
            <Ionicons name="card-outline" size={16} color={colors.inkSoft} />
            <Text style={styles.paymentText}>Payment refund: {labelize(c.paymentRefundStatus).toLowerCase()}</Text>
          </View>
        ) : null}
      </Card>

      {calc ? (
        <Card title="How it adds up" icon="calculator-outline" tint="rose">
          <View>
            <AmountRow label="Paid" value={formatMinor(calc.grossPaidMinor, calc.currency)} />
            <AmountRow label="Airline/hotel penalty" value={`${calc.supplierPenaltyMinor ? "− " : ""}${formatMinor(calc.supplierPenaltyMinor, calc.currency)}`} tone={calc.supplierPenaltyMinor ? "minus" : undefined} />
            <AmountRow label="Service fee" value={`${calc.agencyFeeMinor ? "− " : ""}${formatMinor(calc.agencyFeeMinor, calc.currency)}`} tone={calc.agencyFeeMinor ? "minus" : undefined} />
            {calc.travelCreditMinor ? <AmountRow label="Travel credit" value={formatMinor(calc.travelCreditMinor, calc.currency)} /> : null}
            <AmountRow label="Refundable" value={formatMinor(calc.refundableMinor, calc.currency)} strong />
          </View>
          {calc.dataStatus !== "OK" ? <Notice tone="info" message="These figures still need an agent to confirm them." /> : null}
        </Card>
      ) : null}

      <Card title="Details" icon="document-text-outline" tint="slate">
        <Detail icon="chatbox-ellipses-outline" label="Reason" value={c.reason} />
        <Detail icon="git-branch-outline" label="Partial refund" value={c.partial ? "Yes" : null} />
        <Detail icon="business-outline" label="Supplier note" value={c.supplierOperationNote} />
        <Detail icon="alert-circle-outline" label="Failure" value={c.failureReason} />
        <Detail icon="calendar-outline" label="Opened" value={new Date(c.createdAt).toLocaleString()} />
        <Detail icon="checkmark-done-outline" label="Completed" value={c.completedAt ? new Date(c.completedAt).toLocaleString() : null} />
        <ListRow
          icon="airplane-outline"
          tint="blue"
          title="Open booking"
          detail="See the trip this case is about"
          onPress={() => router.push({ pathname: "/checkout/[bookingId]", params: { bookingId: c.bookingId } })}
          last
        />
      </Card>

      {history.length ? (
        <Card title="History" icon="time-outline" tint="slate" subtitle="Oldest first">
          <Timeline
            items={history.map((a, i) => ({
              key: a.id,
              title: sentence(a.action),
              when: new Date(a.createdAt).toLocaleString(),
              tint: i === lastIndex ? look.tint : "slate",
            }))}
          />
        </Card>
      ) : null}

      <Card title="Need help with this refund?" subtitle="Ask Ava or open a support case." icon="chatbubbles-outline" tint="blue">
        <View style={styles.actions}>
          <Button label="Ask Ava" variant="ghost" style={styles.flex} onPress={() => router.navigate({ pathname: "/ava", params: { q: `About refund case ${c.id.slice(-8).toUpperCase()}: ` } })} />
          <Button label="Support" variant="ghost" style={styles.flex} onPress={() => router.push("/support")} />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  ref: { fontFamily: fonts.bodySemi, fontSize: 13, letterSpacing: 0.6, color: colors.inkFaint },
  hero: { gap: 2 },
  heroLabel: { fontFamily: fonts.bodySemi, fontSize: 12, letterSpacing: 0.6, textTransform: "uppercase", color: colors.inkSoft },
  heroAmount: { fontFamily: fonts.display, fontSize: 30, color: colors.ink },
  copyRow: { flexDirection: "row", gap: space.sm },
  payment: { flexDirection: "row", alignItems: "center", gap: space.sm, backgroundColor: colors.bg, borderRadius: radius.sm, padding: space.md },
  paymentText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.ink },
  detail: { flexDirection: "row", gap: space.md },
  detailIcon: { marginTop: 2 },
  detailLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.inkFaint },
  detailValue: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.ink },
  actions: { flexDirection: "row", gap: space.sm },
});
