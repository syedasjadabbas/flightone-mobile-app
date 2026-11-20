import { useCallback, useMemo, useState } from "react";
import { Dimensions, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";
import { useAuthStore } from "@/core/auth/auth.store";
import { colors, fonts, radius, shadow, space } from "@/core/theme/tokens";
import { useTravellerLocation } from "@/features/ava/hooks/useTravellerLocation";
import { useProfileQuery } from "@/features/profile/api/profileApi";
import { useRewardsSummaryQuery } from "@/features/rewards/api/rewardsApi";
import { useJourneyWatchesQuery } from "@/features/trips/api/journeyApi";
import { NextTripCard } from "@/features/trips/components/NextTripCard";
import { localToday, sortTrips, tripView } from "@/features/trips/lib/tripList";
import { DestinationCarousel3D } from "../components/DestinationCarousel3D";
import { Globe3D, type GlobePlace } from "../components/Globe3D";
import { TRENDING, destinationPrompt } from "../lib/destinations";
import { CITY_COORDS } from "../lib/globe";

type IconName = keyof typeof Ionicons.glyphMap;

const SCREEN = Dimensions.get("window").width;
const GLOBE = Math.min(330, SCREEN - space.xl * 2);
const NIGHT = "#0b1219";
const CYAN = "#7fd3f7";
const GOLD = "#f5c26b";

const QUICK: { label: string; icon: IconName; fg: string; bg: string; go: () => void }[] = [
  { label: "Flights", icon: "airplane", fg: colors.accent, bg: colors.accentSoft, go: () => router.navigate({ pathname: "/book", params: { tab: "flights" } }) },
  { label: "Stays", icon: "bed", fg: "#6a4bd1", bg: "#efeafd", go: () => router.navigate({ pathname: "/book", params: { tab: "stays" } }) },
  { label: "Cars", icon: "car-sport", fg: "#0f7c86", bg: "#e2f4f5", go: () => router.navigate({ pathname: "/book", params: { tab: "cars" } }) },
  { label: "Visa", icon: "document-text", fg: colors.success, bg: colors.successSoft, go: () => router.push("/visa") },
];

const TRUST: { icon: IconName; label: string }[] = [
  { icon: "flash", label: "Live fares" },
  { icon: "shield-checkmark", label: "Price confirmed" },
  { icon: "headset", label: "Real people" },
];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function askAva(q: string) {
  router.navigate({ pathname: "/ava", params: { q } });
}

/** A fixed scatter of stars for the night-sky hero (same every time). */
function makeStars(width: number, height: number) {
  const out: { x: number; y: number; r: number; o: number }[] = [];
  let seed = 7;
  for (let i = 0; i < 46; i++) {
    const next = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    out.push({ x: next() * width, y: next() * height, r: 0.5 + next() * 1.2, o: 0.2 + next() * 0.6 });
  }
  return out;
}

function SectionHead({ title, sub, action }: { title: string; sub?: string; action?: { label: string; onPress: () => void } }) {
  return (
    <View style={styles.sectionHead}>
      <View style={styles.flex}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {sub ? <Text style={styles.sectionSub}>{sub}</Text> : null}
      </View>
      {action ? (
        <Pressable accessibilityRole="button" onPress={action.onPress} hitSlop={8}>
          <Text style={styles.sectionAction}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * Home: a night-sky hero with the 3D globe of routes from your city, Ask Ava,
 * quick actions, your next trip, trending destinations (3D carousel) and rewards.
 */
export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const { location } = useTravellerLocation();
  const { data: profile } = useProfileQuery();
  const { data: rewards } = useRewardsSummaryQuery();
  const { data: trips } = useJourneyWatchesQuery();
  const [q, setQ] = useState("");

  // Light status bar over the dark hero while Home is on screen.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("light", true);
      return () => setStatusBarStyle("dark", true);
    }, []),
  );

  const heroHeight = insets.top + 96 + GLOBE + 34;
  const stars = useMemo(() => makeStars(SCREEN, heroHeight), [heroHeight]);

  const originCity = location?.place || "Lahore";
  const origin: GlobePlace = useMemo(() => {
    const known = location?.iata ? CITY_COORDS[location.iata] : undefined;
    if (known && location?.iata) return { code: location.iata, ...known };
    if (location?.latitude != null && location.longitude != null) {
      return { code: location.iata ?? location.city.slice(0, 3).toUpperCase(), lat: location.latitude, lon: location.longitude };
    }
    return { code: "LHE", ...CITY_COORDS.LHE };
  }, [location]);
  const destinations: GlobePlace[] = useMemo(
    () => TRENDING.filter((d) => d.code !== origin.code).map((d) => ({ code: d.code, ...CITY_COORDS[d.code] })),
    [origin.code],
  );

  const today = localToday();
  const next = useMemo(() => sortTrips((trips?.items ?? []).filter((w) => tripView(w) === "upcoming"), "upcoming")[0], [trips]);
  const meta = (profile?.metadata && typeof profile.metadata === "object" ? profile.metadata : {}) as { avatarUrl?: string };
  const first = (profile?.displayName || user?.name || "").split(" ")[0];
  const ratio = Math.min(1, Math.max(0, rewards?.progress.progressRatio ?? 0));

  const submit = () => {
    const text = q.trim();
    if (!text) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setQ("");
    askAva(text);
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
      >
        {/* Night-sky hero */}
        <View style={[styles.hero, { height: heroHeight, paddingTop: insets.top + space.md }]}>
          <Svg style={StyleSheet.absoluteFill} width={SCREEN} height={heroHeight}>
            <Defs>
              <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#081019" />
                <Stop offset="0.6" stopColor={NIGHT} />
                <Stop offset="1" stopColor="#0f2c40" />
              </LinearGradient>
              <RadialGradient id="glow" cx="50%" cy="62%" r="55%">
                <Stop offset="0" stopColor={CYAN} stopOpacity="0.16" />
                <Stop offset="1" stopColor={CYAN} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Rect x={0} y={0} width={SCREEN} height={heroHeight} fill="url(#sky)" />
            <Rect x={0} y={0} width={SCREEN} height={heroHeight} fill="url(#glow)" />
            {stars.map((s, i) => (
              <Circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={s.o} />
            ))}
          </Svg>

          <View style={styles.header}>
            <View style={styles.flex}>
              <Text style={styles.hello}>
                {greeting()}
                {first ? `, ${first}` : ""}
              </Text>
              <Text style={styles.headline}>Where to next?</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Your profile" onPress={() => router.push("/profile")} style={styles.avatarRing}>
              <View style={styles.avatar}>
                {meta.avatarUrl ? <Image source={{ uri: meta.avatarUrl }} style={styles.avatarImg} /> : <Ionicons name="person" size={18} color="#fff" />}
              </View>
            </Pressable>
          </View>

          <View style={styles.globe}>
            <Globe3D size={GLOBE} origin={origin} destinations={destinations} variant="night" />
          </View>
          <View style={styles.from} pointerEvents="none">
            <Ionicons name="navigate" size={12} color={GOLD} />
            <Text style={styles.fromText}>Flying from {originCity}</Text>
          </View>
        </View>

        {/* Ask Ava — floats over the hero's bottom edge */}
        <View style={styles.ask}>
          <View style={styles.askIcon}>
            <Ionicons name="sparkles" size={16} color="#fff" />
          </View>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Ask Ava: Dubai next Friday, 2 adults…"
            placeholderTextColor={colors.inkFaint}
            style={styles.askInput}
            returnKeyType="send"
            onSubmitEditing={submit}
            accessibilityLabel="Ask Ava"
          />
          <Pressable accessibilityRole="button" accessibilityLabel="Send to Ava" onPress={submit} style={({ pressed }) => [styles.askBtn, pressed && styles.pressed]}>
            <Ionicons name="arrow-up" size={18} color="#fff" />
          </Pressable>
        </View>

        {/* Quick actions */}
        <View style={styles.quick}>
          {QUICK.map((a) => (
            <Pressable
              key={a.label}
              accessibilityRole="button"
              accessibilityLabel={a.label}
              onPress={() => {
                void Haptics.selectionAsync().catch(() => {});
                a.go();
              }}
              style={({ pressed }) => [styles.quickItem, pressed && styles.pressed]}
            >
              <View style={[styles.quickIcon, { backgroundColor: a.bg }]}>
                <Ionicons name={a.icon} size={22} color={a.fg} />
              </View>
              <Text style={styles.quickText}>{a.label}</Text>
            </Pressable>
          ))}
        </View>

        {next ? (
          <View style={styles.block}>
            <SectionHead title={next.phase === "IN_PROGRESS" ? "Travelling now" : "Your next trip"} action={{ label: "All trips", onPress: () => router.navigate("/trips") }} />
            <NextTripCard watch={next} today={today} />
          </View>
        ) : null}

        <View style={styles.block}>
          <SectionHead title={`Trending from ${originCity}`} sub="Tap a city and Ava finds the best fares" />
        </View>
        <DestinationCarousel3D items={TRENDING.filter((d) => d.code !== origin.code)} onPick={(d) => askAva(destinationPrompt(originCity, d.city))} />

        {rewards ? (
          <View style={styles.block}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Rewards: ${rewards.balance} points, ${rewards.tier}`} onPress={() => router.push("/rewards")} style={({ pressed }) => [styles.rewards, pressed && styles.pressed]}>
              <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none" viewBox="0 0 100 100">
                <Defs>
                  <LinearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor="#1d2a38" />
                    <Stop offset="0.6" stopColor={NIGHT} />
                    <Stop offset="1" stopColor="#3a2c12" />
                  </LinearGradient>
                </Defs>
                <Rect x="0" y="0" width="100" height="100" fill="url(#gold)" />
              </Svg>
              <View style={styles.rewardsTop}>
                <View style={styles.tier}>
                  <Ionicons name="diamond" size={11} color={GOLD} />
                  <Text style={styles.tierText}>{rewards.tier.replace(/_/g, " ")}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.6)" />
              </View>
              <Text style={styles.points}>
                {Math.round(rewards.balance).toLocaleString("en-US")} <Text style={styles.pointsUnit}>points</Text>
              </Text>
              {rewards.progress.nextTier ? (
                <>
                  <View style={styles.bar}>
                    <View style={[styles.fill, { width: `${Math.max(3, Math.round(ratio * 100))}%` }]} />
                  </View>
                  <Text style={styles.rewardsSub}>
                    {Math.round(rewards.progress.pointsToNext).toLocaleString("en-US")} to {rewards.progress.nextTier.replace(/_/g, " ").toLowerCase()}
                  </Text>
                </>
              ) : (
                <Text style={styles.rewardsSub}>Top tier. Enjoy the perks.</Text>
              )}
            </Pressable>
          </View>
        ) : null}

        <View style={styles.trust}>
          {TRUST.map((t) => (
            <View key={t.label} style={styles.trustItem}>
              <Ionicons name={t.icon} size={14} color={colors.accent} />
              <Text style={styles.trustText}>{t.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 120 },
  flex: { flex: 1 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },

  hero: { overflow: "hidden", borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: space.lg, gap: space.md },
  hello: { fontFamily: fonts.bodyMedium, fontSize: 14, color: "rgba(255,255,255,0.7)" },
  headline: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34, color: "#fff", marginTop: 2 },
  avatarRing: { padding: 2, borderRadius: 26, borderWidth: 1.5, borderColor: "rgba(245,194,107,0.7)" },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImg: { width: 42, height: 42 },
  globe: { alignItems: "center", marginTop: space.sm },
  from: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.2)",
  },
  fromText: { fontFamily: fonts.bodySemi, fontSize: 12, color: "#fff" },

  ask: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    marginHorizontal: space.lg,
    marginTop: -28,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingLeft: 7,
    paddingRight: 6,
    minHeight: 58,
    ...shadow,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },
  askIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  askInput: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.ink, paddingVertical: space.md },
  askBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.btn, alignItems: "center", justifyContent: "center" },

  quick: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: space.lg,
    marginTop: space.lg,
    backgroundColor: colors.card,
    borderRadius: radius.md + 8,
    paddingVertical: space.lg,
    paddingHorizontal: space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  quickItem: { flex: 1, alignItems: "center", gap: 8 },
  quickIcon: { width: 52, height: 52, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  quickText: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.ink },

  block: { marginHorizontal: space.lg, marginTop: space.xl, gap: space.md },
  sectionHead: { flexDirection: "row", alignItems: "flex-end", gap: space.md },
  sectionTitle: { fontFamily: fonts.display, fontSize: 19, color: colors.ink },
  sectionSub: { fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft, marginTop: 2 },
  sectionAction: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.accent },

  rewards: { borderRadius: radius.md + 10, overflow: "hidden", padding: space.lg, gap: space.sm, backgroundColor: NIGHT },
  rewardsTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  tier: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(245,194,107,0.16)", borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  tierText: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", color: GOLD },
  points: { fontFamily: fonts.display, fontSize: 30, color: "#fff" },
  pointsUnit: { fontFamily: fonts.bodyMedium, fontSize: 14, color: "rgba(255,255,255,0.7)" },
  bar: { height: 6, borderRadius: radius.pill, backgroundColor: "rgba(255,255,255,0.12)", overflow: "hidden" },
  fill: { height: 6, borderRadius: radius.pill, backgroundColor: GOLD },
  rewardsSub: { fontFamily: fonts.body, fontSize: 13, color: "rgba(255,255,255,0.7)" },

  trust: { flexDirection: "row", justifyContent: "center", gap: space.lg, marginTop: space.xl, paddingHorizontal: space.lg },
  trustItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  trustText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.inkSoft },
});
