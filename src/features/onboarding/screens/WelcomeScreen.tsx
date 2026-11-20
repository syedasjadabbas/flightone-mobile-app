import { useMemo, useRef, useState, type ComponentRef } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";
import { useOnboardingStore } from "@/core/onboarding/onboarding.store";
import { colors, fonts, radius, space } from "@/core/theme/tokens";
import { declineTravellerLocation, requestTravellerLocation } from "@/features/ava/hooks/useTravellerLocation";

type IconName = keyof typeof Ionicons.glyphMap;

const CYAN = "#7fd3f7";
const GOLD = "#f5c26b";

type Slide = { key: string; icon: IconName; accent: string; eyebrow: string; title: string; body: string; points: string[] };

const SLIDES: Slide[] = [
  {
    key: "ava",
    icon: "sparkles",
    accent: CYAN,
    eyebrow: "Meet Ava",
    title: "Your AI travel consultant",
    body: "Tell Ava your trip in your own words. She searches live fares and stays and picks the best options.",
    points: ["“Dubai next Friday for 2”", "Compares airlines and prices", "Explains every option"],
  },
  {
    key: "book",
    icon: "airplane",
    accent: GOLD,
    eyebrow: "Book in a few taps",
    title: "Real prices, confirmed",
    body: "Every price is confirmed by FlightOne before you pay. Your e-ticket is ready to download and share.",
    points: ["Live fares, no surprises", "Card, bank transfer or company credit", "E-ticket PDF in seconds"],
  },
  {
    key: "trips",
    icon: "briefcase",
    accent: "#7be3b0",
    eyebrow: "Your trips, handled",
    title: "Live updates, one place",
    body: "Gate changes, delays and check-in reminders, with your passports and visas safe in the Travel Vault.",
    points: ["Live flight status", "Refunds and changes in-app", "Points on every trip"],
  },
];

/** Fixed star field for the night background. */
function makeStars(width: number, height: number) {
  const out: { x: number; y: number; r: number; o: number }[] = [];
  let seed = 11;
  for (let i = 0; i < 60; i++) {
    const next = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    out.push({ x: next() * width, y: next() * height, r: 0.5 + next() * 1.2, o: 0.15 + next() * 0.55 });
  }
  return out;
}

/**
 * First-launch intro: three slides about Ava, booking and trips, then a short
 * explanation before the location permission prompt. Shown once per device.
 */
export function WelcomeScreen() {
  const { width: W, height: H } = useWindowDimensions();
  const markSeen = useOnboardingStore((s) => s.markSeen);
  const [page, setPage] = useState(0);
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const stars = useMemo(() => makeStars(W, H), [W, H]);
  const total = SLIDES.length + 1; // + location
  const last = page === total - 1;

  const go = (i: number) => {
    void Haptics.selectionAsync().catch(() => {});
    scroller.current?.scrollTo({ x: i * W, animated: true });
    setPage(i);
  };
  const finish = async () => {
    await markSeen();
    router.replace("/login");
  };
  const allowLocation = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    await requestTravellerLocation().catch(() => {});
    await finish();
  };
  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => setPage(Math.round(e.nativeEvent.contentOffset.x / W));

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Svg style={StyleSheet.absoluteFill} width={W} height={H}>
        <Defs>
          <LinearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#081019" />
            <Stop offset="0.65" stopColor="#0b1219" />
            <Stop offset="1" stopColor="#0f2c40" />
          </LinearGradient>
          <RadialGradient id="glow" cx="50%" cy="36%" r="50%">
            <Stop offset="0" stopColor={CYAN} stopOpacity="0.14" />
            <Stop offset="1" stopColor={CYAN} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={W} height={H} fill="url(#bg)" />
        <Rect x={0} y={0} width={W} height={H} fill="url(#glow)" />
        {stars.map((s, i) => (
          <Circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={s.o} />
        ))}
      </Svg>

      <SafeAreaView style={styles.flex} edges={["top", "bottom"]}>
        <View style={styles.top}>
          <Text style={styles.brand}>
            FLIGHT<Text style={styles.brandOne}>ONE</Text>
          </Text>
          {!last ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Skip intro" onPress={() => go(total - 1)} hitSlop={10}>
              <Text style={styles.skip}>Skip</Text>
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScrollEnd}
          style={styles.flex}
        >
          {SLIDES.map((s) => (
            <View key={s.key} style={[styles.slide, { width: W }]}>
              <View style={[styles.orb, { shadowColor: s.accent }]}>
                <View style={[styles.orbRing, { borderColor: `${s.accent}55` }]} />
                <View style={[styles.orbCore, { backgroundColor: `${s.accent}22`, borderColor: `${s.accent}88` }]}>
                  <Ionicons name={s.icon} size={52} color={s.accent} />
                </View>
              </View>
              <Text style={[styles.eyebrow, { color: s.accent }]}>{s.eyebrow}</Text>
              <Text style={styles.title}>{s.title}</Text>
              <Text style={styles.body}>{s.body}</Text>
              <View style={styles.points}>
                {s.points.map((p) => (
                  <View key={p} style={styles.point}>
                    <Ionicons name="checkmark-circle" size={16} color={s.accent} />
                    <Text style={styles.pointText}>{p}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}

          {/* Why we ask for location — shown right before the system prompt. */}
          <View style={[styles.slide, { width: W }]}>
            <View style={[styles.orb, { shadowColor: GOLD }]}>
              <View style={[styles.orbRing, { borderColor: `${GOLD}55` }]} />
              <View style={[styles.orbCore, { backgroundColor: `${GOLD}22`, borderColor: `${GOLD}88` }]}>
                <Ionicons name="navigate" size={50} color={GOLD} />
              </View>
            </View>
            <Text style={[styles.eyebrow, { color: GOLD }]}>Fares from your city</Text>
            <Text style={styles.title}>Search from where you are</Text>
            <Text style={styles.body}>
              Ava uses your approximate location to search flights from your nearest airport and show prices in your currency. You can change it any
              time, and FlightOne never tracks you in the background.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.bottom}>
          <View style={styles.dots} accessibilityRole="progressbar" accessibilityLabel={`Page ${page + 1} of ${total}`}>
            {Array.from({ length: total }, (_, i) => (
              <View key={i} style={[styles.dot, i === page && styles.dotOn]} />
            ))}
          </View>
          {last ? (
            <>
              <Pressable accessibilityRole="button" onPress={() => void allowLocation()} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
                <Ionicons name="navigate" size={17} color={colors.night} />
                <Text style={styles.primaryText}>Allow location</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void declineTravellerLocation();
                  void finish();
                }}
                style={styles.secondary}
                hitSlop={6}
              >
                <Text style={styles.secondaryText}>Not now</Text>
              </Pressable>
            </>
          ) : (
            <Pressable accessibilityRole="button" onPress={() => go(page + 1)} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
              <Text style={styles.primaryText}>Next</Text>
              <Ionicons name="arrow-forward" size={17} color={colors.night} />
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0b1219" },
  flex: { flex: 1 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.xl, paddingTop: space.md },
  brand: { fontFamily: fonts.display, fontSize: 18, letterSpacing: 2, color: "#fff" },
  brandOne: { color: CYAN },
  skip: { fontFamily: fonts.bodySemi, fontSize: 15, color: "rgba(255,255,255,0.7)" },

  slide: { paddingHorizontal: space.xl, justifyContent: "center", alignItems: "center", gap: space.md },
  orb: { width: 190, height: 190, alignItems: "center", justifyContent: "center", marginBottom: space.lg, shadowOpacity: 0.5, shadowRadius: 40, shadowOffset: { width: 0, height: 0 } },
  orbRing: { position: "absolute", width: 190, height: 190, borderRadius: 95, borderWidth: 1 },
  orbCore: { width: 128, height: 128, borderRadius: 64, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  eyebrow: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1.6, textTransform: "uppercase" },
  title: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34, color: "#fff", textAlign: "center" },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: "rgba(255,255,255,0.72)", textAlign: "center", maxWidth: 340 },
  points: { gap: 8, marginTop: space.sm, alignSelf: "center" },
  point: { flexDirection: "row", alignItems: "center", gap: 8 },
  pointText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: "rgba(255,255,255,0.9)" },

  bottom: { paddingHorizontal: space.xl, paddingBottom: space.lg, gap: space.md },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6, marginBottom: space.sm },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.25)" },
  dotOn: { width: 22, backgroundColor: CYAN },
  primary: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm, minHeight: 54, borderRadius: radius.pill, backgroundColor: "#fff" },
  primaryText: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.night },
  secondary: { alignItems: "center", justifyContent: "center", minHeight: 40 },
  secondaryText: { fontFamily: fonts.bodySemi, fontSize: 15, color: "rgba(255,255,255,0.75)" },
});
