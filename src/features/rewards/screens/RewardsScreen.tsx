import { useState } from "react";
import { ActivityIndicator, Share, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { Button, Card, ListRow, Notice, Screen, Tag, TextField } from "@/core/components";
import { formatApiError } from "@/core/api/formatApiError";
import { colors, fonts, radius, space, type } from "@/core/theme/tokens";
import { useAttachReferralMutation, useReferralsQuery, useRewardsLedgerQuery, useRewardsSummaryQuery } from "../api/rewardsApi";
import { formatPts, labelize } from "../lib/rewardsFormat";

/** Balances and totals: plain number with separators. (formatPts is for signed ledger changes.) */
const points = (n: number) => Math.round(n).toLocaleString("en-US");

/** Points balance, tier progress, referrals and the points history. */
export function RewardsScreen() {
  const { data: summary, isLoading, error, refetch } = useRewardsSummaryQuery();
  const [page, setPage] = useState(1);
  const { data: ledger } = useRewardsLedgerQuery({ page });
  const { data: referrals } = useReferralsQuery();
  const [attach, attachState] = useAttachReferralMutation();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const onCopy = async () => {
    if (!summary) return;
    await Clipboard.setStringAsync(summary.referralCode);
    setMessage({ tone: "success", text: "Referral code copied." });
  };
  const onShare = () => {
    if (!summary) return;
    Share.share({ message: `Join me on FlightOne — sign up with my code ${summary.referralCode} and we both earn points.` }).catch(() => {});
  };
  const onAttach = async () => {
    setMessage(null);
    if (!code.trim()) return;
    try {
      await attach({ code: code.trim().toUpperCase() }).unwrap();
      setCode("");
      setMessage({ tone: "success", text: "Referral code added." });
    } catch (err) {
      setMessage({ tone: "error", text: formatApiError(err) });
    }
  };

  if (isLoading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.accent} />
      </Screen>
    );
  }

  const p = summary?.progress;
  const totalPages = ledger?.totalPages ?? 1;

  return (
    <Screen edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: "Rewards" }} />
      {error ? (
        <>
          <Notice message={formatApiError(error, "We couldn't load your rewards.")} />
          <Button label="Retry" variant="ghost" onPress={() => refetch()} />
        </>
      ) : null}

      {summary ? (
        <Card>
          <View style={styles.row}>
            <Tag label={labelize(summary.tier)} tone="accent" />
            <Text style={type.bodySoft}>Lifetime {points(summary.lifetimeEarned)} pts</Text>
          </View>
          <Text style={styles.balance}>{points(summary.balance)}</Text>
          <Text style={type.bodySoft}>points available</Text>
          {p?.nextTier ? (
            <>
              <View style={styles.bar} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round((p.progressRatio || 0) * 100) }}>
                <View style={[styles.fill, { width: `${Math.round(Math.min(1, Math.max(0, p.progressRatio || 0)) * 100)}%` }]} />
              </View>
              <Text style={type.bodySoft}>
                {points(p.pointsToNext)} points to {labelize(p.nextTier)}
              </Text>
            </>
          ) : null}
          {summary.balance === 0 ? (
            <Text style={type.bodySoft}>
              Earn {summary.policy.earnPointsPerHundredMinor} points for every 100 you spend on ticketed bookings. Use them as credit at checkout.
            </Text>
          ) : null}
        </Card>
      ) : null}

      {message ? <Notice tone={message.tone} message={message.text} /> : null}

      {summary ? (
        <Card>
          <Text style={type.h3}>Invite friends</Text>
          <Text style={type.bodySoft}>
            You both get {points(summary.policy.referralBonusPoints)} points after their first booking.
          </Text>
          <Text style={styles.code} selectable>
            {summary.referralCode}
          </Text>
          <View style={styles.row}>
            <Button label="Copy code" variant="ghost" onPress={onCopy} style={styles.flex} />
            <Button label="Share" variant="ghost" onPress={onShare} style={styles.flex} />
          </View>
          {referrals?.items.length ? (
            referrals.items.map((r) => (
              <ListRow
                key={r.id}
                title={r.status === "REWARDED" ? "Rewarded" : "Waiting for first booking"}
                detail={`Joined ${new Date(r.signupAt ?? r.createdAt).toLocaleDateString()}`}
              />
            ))
          ) : null}
          <TextField label="Got a friend's code?" value={code} onChangeText={(t) => setCode(t.toUpperCase())} autoCapitalize="characters" maxLength={32} />
          <Button label="Add code" variant="ghost" onPress={onAttach} loading={attachState.isLoading} disabled={!code.trim()} />
        </Card>
      ) : null}

      <Card>
        <Text style={type.h3}>Points history</Text>
        {ledger?.items.length ? (
          ledger.items.map((e) => (
            <ListRow
              key={e.id}
              title={`${formatPts(e.points)} · ${labelize(e.type).toLowerCase()}`}
              detail={[new Date(e.createdAt).toLocaleDateString(), e.note, e.expiresAt ? `expires ${e.expiresAt.slice(0, 10)}` : null].filter(Boolean).join(" · ")}
            />
          ))
        ) : (
          <Text style={type.bodySoft}>No points yet. They appear here after your first ticketed booking.</Text>
        )}
        {totalPages > 1 ? (
          <View style={styles.row}>
            <Button label="Newer" variant="ghost" disabled={page <= 1} onPress={() => setPage((n) => n - 1)} style={styles.flex} />
            <Button label="Older" variant="ghost" disabled={page >= totalPages} onPress={() => setPage((n) => n + 1)} style={styles.flex} />
          </View>
        ) : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm },
  flex: { flex: 1 },
  balance: { fontFamily: fonts.display, fontSize: 40, color: colors.ink },
  bar: { height: 8, borderRadius: radius.pill, backgroundColor: colors.bgGlow, overflow: "hidden" },
  fill: { height: 8, borderRadius: radius.pill, backgroundColor: colors.accent },
  code: { fontFamily: fonts.display, fontSize: 24, letterSpacing: 2, color: colors.ink },
});
