import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAnimValue } from "@/core/hooks/useAnimValue";
import { colors, fonts, space } from "@/core/theme/tokens";
import type { AvaPhase } from "../types";

/**
 * Shown while Ava works (like the web's progress card): a plane flies across a
 * dotted route, and the steps tick off. The engine only reports "extract" until
 * the supplier search returns (often 20–30 s), so the middle steps advance on a timer.
 */
const STEPS = ["Understanding your trip", "Searching live fares", "Comparing airlines and prices", "Writing your answer"];
const STEP_MS = 5000;

function stepFor(phase: AvaPhase | null, timed: number): number {
  if (phase === "reply" || phase === "done") return 3;
  if (phase === "search") return Math.max(1, Math.min(timed, 2));
  return Math.min(timed, 2);
}

export function ProgressCard({ phase }: { phase: AvaPhase | null }) {
  const [timed, setTimed] = useState(0);
  const fly = useAnimValue(0);
  const { width } = useWindowDimensions();
  // Screen padding + Ava avatar gutter + bubble padding.
  const track = Math.min(width - 136, 320);

  useEffect(() => {
    const t = setInterval(() => setTimed((n) => n + 1), STEP_MS);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(fly, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(fly, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [fly]);

  const current = stepFor(phase, timed);
  const x = fly.interpolate({ inputRange: [0, 1], outputRange: [-12, track - 12] });
  const y = fly.interpolate({ inputRange: [0, 0.5, 1], outputRange: [6, -6, 6] });
  const fade = fly.interpolate({ inputRange: [0, 0.08, 0.9, 1], outputRange: [0, 1, 1, 0] });

  return (
    <View style={styles.card} accessibilityLiveRegion="polite" accessibilityLabel={`Ava is working: ${STEPS[current]}`}>
      <View style={[styles.track, { width: track }]}>
        <View style={styles.dots}>
          {Array.from({ length: 18 }, (_, i) => (
            <View key={i} style={styles.dot} />
          ))}
        </View>
        <Animated.View style={[styles.plane, { opacity: fade, transform: [{ translateX: x }, { translateY: y }] }]}>
          <Ionicons name="airplane" size={20} color={colors.accent} />
        </Animated.View>
      </View>
      <View style={styles.steps}>
        {STEPS.map((label, i) => {
          const done = i < current;
          const now = i === current;
          return (
            <View key={label} style={styles.step}>
              <View style={[styles.mark, done && styles.markDone, now && styles.markNow]}>
                {done ? <Ionicons name="checkmark" size={11} color="#fff" /> : null}
              </View>
              <Text style={[styles.stepText, done && styles.stepDone, now && styles.stepNow]}>
                {label}
                {now ? "…" : ""}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.md, paddingVertical: space.xs },
  track: { height: 28, justifyContent: "center" },
  dots: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 4 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.accent, opacity: 0.25 },
  plane: { position: "absolute", left: 0 },
  steps: { gap: 8 },
  step: { flexDirection: "row", alignItems: "center", gap: space.sm },
  mark: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  markDone: { backgroundColor: colors.success, borderColor: colors.success },
  markNow: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  stepText: { fontFamily: fonts.body, fontSize: 14, color: colors.inkFaint },
  stepDone: { color: colors.inkSoft },
  stepNow: { fontFamily: fonts.bodySemi, color: colors.ink },
});

