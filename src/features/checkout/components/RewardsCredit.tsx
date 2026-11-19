import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button, Card, Notice, Tag, TextField } from "@/core/components";
import { formatApiError } from "@/core/api/formatApiError";
import { space, type } from "@/core/theme/tokens";
import { useApplyCheckoutCreditMutation, useRewardsSummaryQuery } from "@/features/rewards/api/rewardsApi";
import { formatMinor } from "../lib/checkoutDisplay";
import type { BookingDetail } from "../api/types";

/**
 * Use reward points as credit on a quoted booking (web's CheckoutRewardsSection).
 * One credit per booking; the server caps it at the fare and recalculates the total.
 */
export function RewardsCredit({ booking, onApplied }: { booking: BookingDetail; onApplied: () => void }) {
  const { data: summary } = useRewardsSummaryQuery();
  const [apply, { isLoading }] = useApplyCheckoutCreditMutation();
  const [points, setPoints] = useState("");
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const applied = (booking.metadata as { rewardCredit?: { creditMinor?: number; points?: number } } | null)?.rewardCredit;
  const balance = summary?.balance ?? 0;
  const pointValueMinor = summary?.policy.pointValueMinor ?? 0;

  if (applied?.creditMinor) {
    return (
      <Card title="Rewards credit" icon="diamond-outline" tint="amber" right={<Tag label="Applied" tone="success" />}>
        <Text style={type.body}>
          {applied.points?.toLocaleString()} points → {formatMinor(applied.creditMinor, booking.currency)} off
        </Text>
      </Card>
    );
  }
  if (balance <= 0) return null;

  const n = Number(points);
  const preview = Number.isInteger(n) && n > 0 && pointValueMinor ? Math.min(n * pointValueMinor, booking.amountMinor) : 0;

  return (
    <Card
      title="Rewards credit"
      subtitle="Use points as credit on this booking"
      icon="diamond-outline"
      tint="amber"
      right={<Tag label={`${balance.toLocaleString()} pts`} tone="accent" />}
    >
      <View style={styles.row}>
        <View style={styles.flex}>
          <TextField
            label="Points to use"
            value={points}
            onChangeText={(t) => setPoints(t.replace(/\D/g, ""))}
            keyboardType="number-pad"
            hint={preview ? `≈ ${formatMinor(preview, booking.currency)} off` : undefined}
          />
        </View>
        <Button label="Max" variant="ghost" style={styles.max} onPress={() => setPoints(String(balance))} />
      </View>
      {msg ? <Notice tone={msg.tone} message={msg.text} /> : null}
      <Button
        label="Apply points"
        variant="ghost"
        loading={isLoading}
        disabled={!n || n > balance}
        onPress={async () => {
          setMsg(null);
          try {
            const r = await apply({ bookingId: booking.id, points: n, idempotencyKey: `app-credit:${booking.id}` }).unwrap();
            setMsg({ tone: "success", text: `${r.points.toLocaleString()} points applied — you now pay ${formatMinor(r.chargeableAmountMinor, booking.currency)}.` });
            onApplied();
          } catch (err) {
            setMsg({ tone: "error", text: formatApiError(err) });
          }
        }}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: space.sm },
  flex: { flex: 1 },
  max: { marginTop: 22, minWidth: 70 },
});
