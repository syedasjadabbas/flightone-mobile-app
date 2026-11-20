import { StyleSheet, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

const NIGHT = "#0b1219";
const NIGHT_SOFT = "#1d3347";
const CYAN = "#7fd3f7";
const GOLD = "#f5c26b";

/**
 * Ava's badge: a night-navy gradient tile with a cyan/gold sparkle, matching the
 * Home hero. Sized from small (a dot beside a reply) up to the empty-state hero.
 */
export function AvaAvatar({ size = 28, online = false }: { size?: number; online?: boolean }) {
  const r = Math.round(size * 0.32);
  const dot = Math.max(8, Math.round(size * 0.28));
  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="avaBadge" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={NIGHT_SOFT} />
            <Stop offset="1" stopColor={NIGHT} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={size} height={size} rx={r} ry={r} fill="url(#avaBadge)" />
      </Svg>
      <View style={styles.center}>
        <Ionicons name="sparkles" size={Math.round(size * 0.52)} color={CYAN} />
      </View>
      <View
        style={[
          styles.glint,
          { width: Math.max(3, size * 0.12), height: Math.max(3, size * 0.12), borderRadius: size, top: size * 0.16, right: size * 0.18 },
        ]}
      />
      {online ? (
        <View style={[styles.online, { width: dot, height: dot, borderRadius: dot / 2, right: -dot * 0.2, bottom: -dot * 0.2 }]} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  glint: { position: "absolute", backgroundColor: GOLD },
  online: { position: "absolute", backgroundColor: "#2fbf7f", borderWidth: 2, borderColor: "#ffffff" },
});
