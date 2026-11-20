import { useEffect } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, View, type DimensionValue, type ViewStyle } from "react-native";
import { useAnimValue } from "@/core/hooks/useAnimValue";
import { colors, radius, space } from "@/core/theme/tokens";

/**
 * Grey placeholder shapes shown while a page loads, in the layout of the real
 * content, gently pulsing. Use the building blocks (`Skeleton`) or the ready
 * made `SkeletonList` / `SkeletonCard`.
 */
export function Skeleton({ width = "100%", height = 14, radius: r = 8, style }: { width?: DimensionValue; height?: number; radius?: number; style?: ViewStyle }) {
  return <PulseView style={[{ width, height, borderRadius: r, backgroundColor: "#e3e9ef" }, style]} />;
}

function PulseView({ style }: { style: ViewStyle | (ViewStyle | undefined)[] }) {
  const pulse = useAnimValue(0);
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled || reduce) return;
        loop = Animated.loop(
          Animated.sequence([
            Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
            Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          ]),
        );
        loop.start();
      });
    return () => {
      cancelled = true;
      loop?.stop();
    };
  }, [pulse]);
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] });
  return <Animated.View style={[style, { opacity }]} />;
}

/** A card-shaped placeholder: icon square + two text lines (+ optional third). */
export function SkeletonRow({ lines = 2, iconSize = 40 }: { lines?: 2 | 3; iconSize?: number }) {
  return (
    <View style={styles.row}>
      <Skeleton width={iconSize} height={iconSize} radius={12} />
      <View style={styles.rowText}>
        <Skeleton width="62%" height={15} />
        <Skeleton width="40%" height={12} />
        {lines === 3 ? <Skeleton width="28%" height={18} radius={9} /> : null}
      </View>
    </View>
  );
}

/** N row placeholders, each in its own card (matches list pages like Trips). */
export function SkeletonList({ count = 4, lines = 2, iconSize }: { count?: number; lines?: 2 | 3; iconSize?: number }) {
  return (
    <View style={styles.list} accessibilityLabel="Loading" accessibilityRole="progressbar">
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.card}>
          <SkeletonRow lines={lines} iconSize={iconSize} />
        </View>
      ))}
    </View>
  );
}

/** A tall hero-card placeholder (e.g. the Up next card or a summary card). */
export function SkeletonCard({ height = 150, dark = false }: { height?: number; dark?: boolean }) {
  return <PulseView style={[styles.hero, { height }, dark ? styles.heroDark : undefined]} />;
}

const styles = StyleSheet.create({
  list: { gap: space.sm },
  card: { backgroundColor: colors.card, borderRadius: radius.md + 4, padding: space.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  row: { flexDirection: "row", alignItems: "center", gap: space.md },
  rowText: { flex: 1, gap: 8 },
  hero: { borderRadius: radius.md + 10, backgroundColor: "#e3e9ef" },
  heroDark: { backgroundColor: "#1a2632" },
});
