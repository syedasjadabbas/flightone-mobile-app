import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { Button, Card, EmptyState, Notice, Screen, SectionLabel, TextField, TINT } from "@/core/components";
import { formatApiError } from "@/core/api/formatApiError";
import { colors, fonts, radius, space } from "@/core/theme/tokens";
import { ToneTag } from "@/features/vault/components/ToneTag";
import { useAttachReferralMutation, useReferralsQuery, useRewardsLedgerQuery, useRewardsSummaryQuery, type RewardLedgerEntry } from "../api/rewardsApi";
import { formatPts, labelize } from "../lib/rewardsFormat";

/** Balances and totals: plain number with separators. (formatPts is for signed ledger changes.) */
const points = (n: number) => Math.round(n).toLocaleString("en-US");
/** "SILVER_PLUS" → "Silver plus". */
const nice = (s: string) => labelize(s).toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

function LedgerRow({ e, last }: { e: RewardLedgerEntry; last: boolean }) {
  const earn = e.points >= 0;
  const t = earn ? TINT.green : TINT.rose;
  return (
    <View style={[styles.ledger, !last && styles.divider]}>
      <View style={[styles.badge, { backgroundColor: t.bg }]}>
        <Ionicons name={earn ? "arrow-up" : "arrow-down"} size={16} color={t.fg} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.rowTitle}>{nice(e.type)}</Text>
        <Text style={styles.rowDetail} numberOfLines={2}>
          {[new Date(e.createdAt).toLocaleDateString(), e.note, e.expiresAt ? `expires ${e.expiresAt.slice(0, 10)}` : null].filter(Boolean).join(" · ")}
        </Text>
      </View>
      <Text style={[styles.pts, { color: t.fg }]}>{formatPts(e.points)}</Text>
    </View>
  );
}

/** "November 2026" for grouping the history. */
const monthOf = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { month: "long", year: "numeric" });

function HowTile({ icon, title, body }: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }) {
  return (
    <View style={styles.how}>
      <View style={[styles.badge, { backgroundColor: TINT.amber.bg }]}>
        <Ionicons name={icon} size={17} color={TINT.amber.fg} />
      </View>
      <Text style={styles.howTitle}>{title}</Text>
      <Text style={styles.howBody}>{body}</Text>
    </View>
  );
}

/** Points balance, tier progress, how it works, tier ladder, referrals and the points history. */
export function RewardsScreen() {
  const { data: summary, isLoading, error, refetch } = useRewardsSummaryQuery();
  const [page, setPage] = useState(1);
  const { data: ledger } = useRewardsLedgerQuery({ page });
  const { data: referrals } = useReferralsQuery();
  const [attach, attachState] = useAttachReferralMutation();
  const [code, setCode] = useState("");
  const [showCodeField, setShowCodeField] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    },
    [],
  );

  const onCopy = async () => {
    if (!summary) return;
    await Clipboard.setStringAsync(summary.referralCode);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setCopied(true);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), 2000);
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
      setShowCodeField(false);
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
  const ratio = Math.min(1, Math.max(0, p?.progressRatio || 0));
  const refs = referrals?.items ?? [];
  const rewarded = refs.filter((r) => r.status === "REWARDED").length;

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
        <View style={styles.hero}>
          {/* Card finish: deep navy with a warm gold sheen. */}
          <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none" viewBox="0 0 100 100">
            <Defs>
              <LinearGradient id="card" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#1d2a38" />
                <Stop offset="0.55" stopColor={colors.night} />
                <Stop offset="1" stopColor="#3a2c12" />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100" height="100" fill="url(#card)" />
          </Svg>
          <View style={styles.heroTop}>
            <View style={styles.brand}>
              <Ionicons name="airplane" size={14} color="#f5c26b" />
              <Text style={styles.brandText}>FlightOne Rewards</Text>
            </View>
            <View style={styles.tier}>
              <Ionicons name="diamond" size={12} color="#f5c26b" />
              <Text style={styles.tierText}>{nice(summary.tier)}</Text>
            </View>
          </View>
          <View>
            <Text style={styles.balance} accessibilityLabel={`${points(summary.balance)} points available`}>
              {points(summary.balance)}
            </Text>
            <Text style={styles.heroSoft}>
              points available
              {summary.balance > 0 && summary.policy.pointValueMinor
                ? ` · worth about ${Math.round((summary.balance * summary.policy.pointValueMinor) / 100).toLocaleString("en-US")} off at checkout`
                : ""}
            </Text>
          </View>
          {p?.nextTier ? (
            <View style={styles.progress}>
              <View style={styles.bar} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(ratio * 100) }}>
                <View style={[styles.fill, { width: `${Math.max(3, Math.round(ratio * 100))}%` }]} />
              </View>
              <Text style={styles.heroSoft}>
                <Text style={styles.heroStrong}>{points(p.pointsToNext)} points</Text> to {nice(p.nextTier)}
              </Text>
            </View>
          ) : (
            <Text style={styles.heroSoft}>You&apos;ve reached the top tier. Enjoy the perks.</Text>
          )}
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{points(summary.lifetimeEarned)}</Text>
              <Text style={styles.heroLabel}>Lifetime pts</Text>
            </View>
            <View style={[styles.heroStat, styles.heroStatDivider]}>
              <Text style={styles.heroStatValue}>{refs.length}</Text>
              <Text style={styles.heroLabel}>Friends joined</Text>
            </View>
            <View style={[styles.heroStat, styles.heroStatDivider]}>
              <Text style={styles.heroStatValue}>{rewarded}</Text>
              <Text style={styles.heroLabel}>Rewarded</Text>
            </View>
          </View>
        </View>
      ) : null}

      {summary ? (
        <>
          <SectionLabel>How it works</SectionLabel>
          <View style={styles.hows}>
            <HowTile icon="airplane-outline" title="Book" body={`${summary.policy.earnPointsPerHundredMinor} pts per 100 spent`} />
            <HowTile icon="gift-outline" title="Invite" body={`+${points(summary.policy.referralBonusPoints)} pts each`} />
            <HowTile
              icon="card-outline"
              title="Use"
              body={summary.policy.creditExpiryDays ? `At checkout · ${summary.policy.creditExpiryDays}-day expiry` : "As credit at checkout"}
            />
          </View>
        </>
      ) : null}

      {summary?.policy.tierThresholds?.length ? (
        <Card title="Tiers" subtitle={summary.policy.tierNotes || "Climb by earning points on ticketed trips."} icon="podium-outline" tint="amber">
          {summary.policy.tierThresholds.map((t, i, all) => {
            const current = t.tier === summary.tier;
            const reached = summary.lifetimeEarned >= t.minInclusive;
            return (
              <View key={t.tier} style={[styles.tierRow, i < all.length - 1 && styles.divider]}>
                <View style={[styles.tierDot, reached && styles.tierDotOn, current && styles.tierDotNow]}>
                  {reached ? <Ionicons name={current ? "diamond" : "checkmark"} size={12} color="#fff" /> : null}
                </View>
                <Text style={[styles.tierName, current && styles.tierNameNow]}>{nice(t.tier)}</Text>
                {current ? (
                  <View style={styles.here}>
                    <Text style={styles.hereText}>You&apos;re here</Text>
                  </View>
                ) : null}
                <Text style={styles.tierMin}>{t.minInclusive ? `${points(t.minInclusive)}+ pts` : "Start"}</Text>
              </View>
            );
          })}
        </Card>
      ) : null}

      {message ? <Notice tone={message.tone} message={message.text} /> : null}

      {summary ? (
        <Card
          title="Invite friends"
          subtitle={`You both get ${points(summary.policy.referralBonusPoints)} points after their first booking.`}
          icon="gift-outline"
          tint="amber"
        >
          {summary.referralCode ? (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Copy referral code ${summary.referralCode}`}
                onPress={onCopy}
                style={({ pressed }) => [styles.codeBox, pressed && styles.pressed]}
              >
                <View style={styles.flex}>
                  <Text style={styles.codeLabel}>Your code</Text>
                  <Text style={styles.code} selectable>
                    {summary.referralCode}
                  </Text>
                </View>
                <View style={[styles.copy, copied && styles.copied]}>
                  <Ionicons name={copied ? "checkmark" : "copy-outline"} size={16} color={copied ? colors.success : colors.ink} />
                  <Text style={[styles.copyText, copied && { color: colors.success }]}>{copied ? "Copied" : "Copy"}</Text>
                </View>
              </Pressable>
              <Button label="Share invite" onPress={onShare} />
            </>
          ) : null}

          {refs.length ? (
            <View>
              {refs.map((r, i) => (
                <View key={r.id} style={[styles.ref, i < refs.length - 1 && styles.divider]}>
                  <View style={[styles.badge, { backgroundColor: TINT.amber.bg }]}>
                    <Ionicons name="person-outline" size={16} color={TINT.amber.fg} />
                  </View>
                  <Text style={[styles.rowDetail, styles.flex]}>Joined {new Date(r.signupAt ?? r.createdAt).toLocaleDateString()}</Text>
                  <ToneTag
                    label={r.status === "REWARDED" ? "Rewarded" : "Waiting for first booking"}
                    tone={r.status === "REWARDED" ? "success" : "warn"}
                  />
                </View>
              ))}
            </View>
          ) : null}

          {showCodeField ? (
            <View style={styles.attach}>
              <TextField
                label="Friend's code"
                value={code}
                onChangeText={(t) => setCode(t.toUpperCase())}
                autoCapitalize="characters"
                maxLength={32}
                autoFocus
              />
              <View style={styles.row}>
                <Button label="Cancel" variant="ghost" onPress={() => setShowCodeField(false)} style={styles.flex} />
                <Button label="Add code" onPress={onAttach} loading={attachState.isLoading} disabled={!code.trim()} style={styles.flex} />
              </View>
            </View>
          ) : (
            <Pressable accessibilityRole="button" onPress={() => setShowCodeField(true)} hitSlop={8} style={styles.link}>
              <Ionicons name="add-circle-outline" size={18} color={colors.accent} />
              <Text style={styles.linkText}>Got a friend&apos;s code?</Text>
            </Pressable>
          )}
        </Card>
      ) : null}

      <SectionLabel right={totalPages > 1 ? <Text style={styles.pageText}>Page {page} of {totalPages}</Text> : undefined}>Points history</SectionLabel>
      {ledger?.items.length ? (
        <Card style={styles.list}>
          {ledger.items.map((e, i) => {
            const month = monthOf(e.createdAt);
            const newMonth = i === 0 || monthOf(ledger.items[i - 1].createdAt) !== month;
            const lastOfMonth = i === ledger.items.length - 1 || monthOf(ledger.items[i + 1].createdAt) !== month;
            return (
              <View key={e.id}>
                {newMonth ? <Text style={[styles.month, i > 0 && styles.monthGap]}>{month}</Text> : null}
                <LedgerRow e={e} last={lastOfMonth} />
              </View>
            );
          })}
          {totalPages > 1 ? (
            <View style={[styles.row, styles.pager]}>
              <Button label="Newer" variant="ghost" disabled={page <= 1} onPress={() => setPage((n) => n - 1)} style={styles.flex} />
              <Button label="Older" variant="ghost" disabled={page >= totalPages} onPress={() => setPage((n) => n + 1)} style={styles.flex} />
            </View>
          ) : null}
        </Card>
      ) : (
        <EmptyState icon="diamond-outline" tint="amber" title="No points yet" body="They appear here after your first ticketed booking." />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm },
  pressed: { opacity: 0.8 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },

  hero: { backgroundColor: colors.night, borderRadius: radius.md + 10, padding: space.xl, gap: space.lg, overflow: "hidden" },
  brand: { flexDirection: "row", alignItems: "center", gap: 6 },
  brandText: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: "rgba(255,255,255,0.75)" },
  heroStats: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: radius.md, paddingVertical: space.md },
  heroStat: { flex: 1, alignItems: "center", gap: 2 },
  heroStatDivider: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: "rgba(255,255,255,0.15)" },
  heroStatValue: { fontFamily: fonts.display, fontSize: 16, color: "#fff" },
  hows: { flexDirection: "row", gap: space.sm },
  how: {
    flex: 1,
    gap: 6,
    backgroundColor: colors.card,
    borderRadius: radius.md + 2,
    padding: space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  howTitle: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.ink },
  howBody: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16, color: colors.inkSoft },
  tierRow: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.md },
  tierDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  tierDotOn: { backgroundColor: "#d9a441", borderColor: "#d9a441" },
  tierDotNow: { backgroundColor: "#b26a00", borderColor: "#b26a00" },
  tierName: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.inkSoft },
  tierNameNow: { color: colors.ink },
  here: { backgroundColor: "#fdf1dc", borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  hereText: { fontFamily: fonts.bodyBold, fontSize: 10, color: "#8a5a00" },
  tierMin: { marginLeft: "auto", fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.inkSoft },
  month: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", color: colors.inkFaint, paddingTop: space.md },
  monthGap: { marginTop: space.sm },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  tier: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: space.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: "rgba(245,194,107,0.16)",
  },
  tierText: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 0.6, color: "#f5c26b", textTransform: "uppercase" },
  balance: { fontFamily: fonts.display, fontSize: 48, lineHeight: 56, color: "#fff" },
  heroSoft: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: "rgba(255,255,255,0.7)" },
  heroStrong: { fontFamily: fonts.bodySemi, color: "#fff" },
  heroLabel: { fontFamily: fonts.bodySemi, fontSize: 12, color: "rgba(255,255,255,0.6)" },
  progress: { gap: space.sm },
  progressLabels: { flexDirection: "row", justifyContent: "space-between" },
  bar: { height: 10, borderRadius: radius.pill, backgroundColor: colors.nightSoft, overflow: "hidden" },
  fill: { height: 10, borderRadius: radius.pill, backgroundColor: "#f5c26b" },
  tip: { flexDirection: "row", gap: space.sm, padding: space.md, borderRadius: radius.md, backgroundColor: colors.nightSoft },

  codeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.md,
    paddingLeft: space.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#e8c98f",
    backgroundColor: "#fdf8ee",
  },
  codeLabel: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: "#b26a00" },
  code: { fontFamily: fonts.display, fontSize: 22, letterSpacing: 2, color: colors.ink },
  copy: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: space.md,
    minHeight: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
  },
  copied: { backgroundColor: colors.successSoft },
  copyText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.ink },
  ref: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.sm + 2 },
  attach: { gap: space.sm },
  link: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingVertical: space.xs },
  linkText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.accent },

  pageText: { fontFamily: fonts.bodySemi, fontSize: 11, color: colors.inkFaint, marginRight: space.xs },
  list: { paddingVertical: space.xs, gap: 0 },
  ledger: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.md },
  badge: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowTitle: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.ink },
  rowDetail: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.inkSoft },
  pts: { fontFamily: fonts.display, fontSize: 16 },
  pager: { paddingVertical: space.sm },
});
