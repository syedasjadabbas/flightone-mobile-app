import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Button, Card, Notice, Screen, Tag } from "@/core/components";
import { formatApiError } from "@/core/api/formatApiError";
import { colors, space, type } from "@/core/theme/tokens";
import { formatMinor } from "@/features/checkout/lib/checkoutDisplay";
import { useRefundCaseQuery } from "../api/refundsApi";
import { CaseProgressBar } from "../components/CaseProgressBar";
import { labelize, statusCopy, statusHeadline } from "../lib/caseStatus";
import { kindLabel } from "../lib/refundFormat";

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Text style={type.bodySoft}>{label}</Text>
      <Text style={type.label}>{value}</Text>
    </View>
  );
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
  return (
    <Screen edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: `${kindLabel(c.kind)} case` }} />
      <Card>
        <Tag label={statusHeadline(c.status)} tone={c.status === "COMPLETED" ? "success" : "accent"} />
        <Text style={type.h2}>#{c.id.slice(-8).toUpperCase()}</Text>
        <CaseProgressBar status={c.status} />
        <Text style={type.body}>{statusCopy(c.status)}</Text>
        {c.paymentRefundStatus ? <Text style={type.bodySoft}>Payment refund: {labelize(c.paymentRefundStatus).toLowerCase()}</Text> : null}
      </Card>

      {calc ? (
        <Card>
          <Text style={type.h3}>Calculation</Text>
          <Row label="Paid" value={formatMinor(calc.grossPaidMinor, calc.currency)} />
          <Row label="Airline/hotel penalty" value={formatMinor(calc.supplierPenaltyMinor, calc.currency)} />
          <Row label="Service fee" value={formatMinor(calc.agencyFeeMinor, calc.currency)} />
          <Row label="Refundable" value={formatMinor(calc.refundableMinor, calc.currency)} />
          {calc.travelCreditMinor ? <Row label="Travel credit" value={formatMinor(calc.travelCreditMinor, calc.currency)} /> : null}
          {calc.dataStatus !== "OK" ? <Notice tone="info" message="These figures still need an agent to confirm them." /> : null}
        </Card>
      ) : null}

      <Card>
        <Text style={type.h3}>Details</Text>
        <Row label="Reason" value={c.reason} />
        <Row label="Partial refund" value={c.partial ? "Yes" : null} />
        <Row label="Supplier note" value={c.supplierOperationNote} />
        <Row label="Failure" value={c.failureReason} />
        <Row label="Opened" value={new Date(c.createdAt).toLocaleString()} />
        <Row label="Completed" value={c.completedAt ? new Date(c.completedAt).toLocaleString() : null} />
        <Button
          label="Open booking"
          variant="ghost"
          onPress={() => router.push({ pathname: "/checkout/[bookingId]", params: { bookingId: c.bookingId } })}
        />
      </Card>

      {c.audit?.length ? (
        <Card>
          <Text style={type.h3}>History</Text>
          {c.audit.map((a) => (
            <Text key={a.id} style={type.bodySoft}>
              {new Date(a.createdAt).toLocaleString()} · {labelize(a.action).toLowerCase()}
            </Text>
          ))}
        </Card>
      ) : null}

      <Card>
        <Text style={type.bodySoft}>Questions about this refund? Ask Ava or open a support case.</Text>
        <View style={styles.actions}>
          <Button label="Ask Ava" variant="ghost" style={styles.flex} onPress={() => router.navigate({ pathname: "/ava", params: { q: `About refund case ${c.id.slice(-8).toUpperCase()}: ` } })} />
          <Button label="Support" variant="ghost" style={styles.flex} onPress={() => router.push("/support")} />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { gap: 2, paddingVertical: 4 },
  actions: { flexDirection: "row", gap: space.sm },
  flex: { flex: 1 },
});
