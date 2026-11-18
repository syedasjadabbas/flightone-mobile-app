import { useMemo, useState } from "react";
import { Dimensions, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAuthStore } from "@/core/auth/auth.store";
import { colors, fonts, radius, shadow, space, type } from "@/core/theme/tokens";
import { useTravellerLocation } from "@/features/ava/hooks/useTravellerLocation";
import { useProfileQuery } from "@/features/profile/api/profileApi";
import { useRewardsSummaryQuery } from "@/features/rewards/api/rewardsApi";
import { useJourneyWatchesQuery } from "@/features/trips/api/journeyApi";
import { journeyHeadline } from "@/features/trips/lib/journeySteps";
import { DestinationCarousel3D } from "../components/DestinationCarousel3D";
import { Globe3D, type GlobePlace } from "../components/Globe3D";
import { TRENDING, destinationPrompt } from "../lib/destinations";
import { CITY_COORDS } from "../lib/globe";

const SCREEN = Dimensions.get("window").width;
const GLOBE = Math.min(360, SCREEN - space.lg * 2);

const QUICK = [
  { label: "Flights", icon: "airplane-outline", go: () => router.navigate({ pathname: "/book", params: { tab: "flights" } }) },
  { label: "Stays", icon: "bed-outline", go: () => router.navigate({ pathname: "/book", params: { tab: "stays" } }) },
  { label: "Cars", icon: "car-outline", go: () => router.navigate({ pathname: "/book", params: { tab: "cars" } }) },
  { label: "Visa", icon: "document-text-outline", go: () => router.push("/visa") },
] as const;

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function askAva(q: string) {
  router.navigate({ pathname: "/ava", params: { q } });
}

/** Home: 3D globe of routes from your city, ask Ava, quick actions, next trip, trending (3D carousel). */
export function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const { location } = useTravellerLocation();
  const { data: profile } = useProfileQuery();
  const { data: rewards } = useRewardsSummaryQuery();
  const { data: trips } = useJourneyWatchesQuery();
  const [q, setQ] = useState("");

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

  const next = trips?.items.find((w) => w.phase === "UPCOMING" || w.phase === "IN_PROGRESS");
  const nextHead = next ? journeyHeadline(next) : null;
  const meta = (profile?.metadata && typeof profile.metadata === "object" ? profile.metadata : {}) as { avatarUrl?: string };
  const first = (profile?.displayName || user?.name || "").split(" ")[0];

  const submit = () => {
    const text = q.trim();
    if (!text) return;
    setQ("");
    askAva(text);
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.flex}>
            <Text style={type.bodySoft}>{greeting()}{first ? `, ${first}` : ""}</Text>
            <Text style={type.h1}>Where to next?</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Your profile" onPress={() => router.push("/profile")} style={styles.avatar}>
            {meta.avatarUrl ? (
              <Image source={{ uri: meta.avatarUrl }} style={styles.avatarImg} />
            ) : (
              <Ionicons name="person" size={20} color={colors.onBtn} />
            )}
          </Pressable>
        </View>

        {/* 3D globe hero */}
        <View style={styles.hero}>
          <Globe3D size={GLOBE} origin={origin} destinations={destinations} />
          <View style={styles.heroLabel} pointerEvents="none">
            <Ionicons name="navigate" size={12} color={colors.accent} />
            <Text style={styles.heroLabelText}>Flying from {originCity}</Text>
          </View>
        </View>

        {/* Ask Ava */}
        <View style={styles.ask}>
          <Ionicons name="sparkles" size={18} color={colors.accent} />
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
          <Pressable accessibilityRole="button" accessibilityLabel="Send to Ava" onPress={submit} style={styles.askBtn}>
            <Ionicons name="arrow-up" size={18} color={colors.onBtn} />
          </Pressable>
        </View>

        <View style={styles.quick}>
          {QUICK.map((a) => (
            <Pressable key={a.label} accessibilityRole="button" accessibilityLabel={a.label} onPress={a.go} style={({ pressed }) => [styles.quickItem, pressed && styles.pressed]}>
              <View style={styles.quickIcon}>
                <Ionicons name={a.icon} size={20} color={colors.ink} />
              </View>
              <Text style={styles.quickText}>{a.label}</Text>
            </Pressable>
          ))}
        </View>

        {next && nextHead ? (
          <Pressable accessibilityRole="button" onPress={() => router.navigate("/trips")} style={({ pressed }) => [styles.trip, pressed && styles.pressed]}>
            <View style={styles.tripIcon}>
              <Ionicons name="airplane" size={18} color={colors.onBtn} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.tripEyebrow}>{next.phase === "IN_PROGRESS" ? "Travelling now" : "Your next trip"}</Text>
              <Text style={type.h3} numberOfLines={1}>{nextHead.route}</Text>
              {nextHead.sub ? <Text style={type.bodySoft} numberOfLines={1}>{nextHead.sub}</Text> : null}
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.inkFaint} />
          </Pressable>
        ) : null}

        <View style={styles.sectionHead}>
          <Text style={type.h2}>Trending from {originCity}</Text>
          <Text style={type.bodySoft}>Tap a city and Ava finds the best fares.</Text>
        </View>
        <DestinationCarousel3D items={TRENDING.filter((d) => d.code !== origin.code)} onPick={(d) => askAva(destinationPrompt(originCity, d.city))} />

        {rewards ? (
          <Pressable accessibilityRole="button" onPress={() => router.push("/rewards")} style={({ pressed }) => [styles.rewards, pressed && styles.pressed]}>
            <Ionicons name="diamond-outline" size={20} color={colors.accent} />
            <View style={styles.flex}>
              <Text style={type.label}>{rewards.balance.toLocaleString()} points · {rewards.tier}</Text>
              <Text style={type.bodySoft} numberOfLines={1}>
                {rewards.progress.nextTier ? `${rewards.progress.pointsToNext.toLocaleString()} to ${rewards.progress.nextTier}` : "Top tier — enjoy the perks"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.inkFaint} />
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: space.xxl },
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: space.lg, paddingTop: space.md, gap: space.md },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImg: { width: 44, height: 44 },
  hero: { alignItems: "center", marginTop: space.sm },
  heroLabel: {
    position: "absolute",
    bottom: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    ...shadow,
  },
  heroLabelText: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.ink },
  ask: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    marginHorizontal: space.lg,
    marginTop: space.lg,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingLeft: space.lg,
    paddingRight: 6,
    minHeight: 54,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow,
  },
  askInput: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.ink, paddingVertical: space.md },
  askBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.btn, alignItems: "center", justifyContent: "center" },
  quick: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: space.lg, marginTop: space.lg },
  quickItem: { alignItems: "center", gap: 6, width: (SCREEN - space.lg * 2) / 4 - space.sm },
  quickIcon: {
    width: 54,
    height: 54,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    ...shadow,
  },
  quickText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.ink },
  pressed: { opacity: 0.8 },
  trip: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    marginHorizontal: space.lg,
    marginTop: space.lg,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: space.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    ...shadow,
  },
  tripIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  tripEyebrow: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: colors.accent },
  rewards: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    marginHorizontal: space.lg,
    marginTop: space.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: space.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  sectionHead: { paddingHorizontal: space.lg, marginTop: space.xl, gap: 2 },
});
