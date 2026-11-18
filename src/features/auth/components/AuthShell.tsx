import type { ReactNode } from "react";
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { colors, fonts, radius, shadow, space, type } from "@/core/theme/tokens";

const LOGO_RATIO = 284 / 878; // assets/splash-logo.png
const DECOR_H = 300;
const ARC_H = 96; // height of the flight-path band drawn above the logo

/** Dots along a gentle flight arc across the top of the screen (same motif as the splash). */
function arcDots(width: number) {
  const pts: { x: number; y: number; r: number; o: number }[] = [];
  const n = 16;
  const x0 = -20;
  const y0 = ARC_H - 6;
  const cx = width * 0.45;
  const cy = -6;
  const x1 = width + 10;
  const y1 = ARC_H * 0.55;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1;
    const y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1;
    pts.push({ x, y, r: 1.6 + t * 1.4, o: 0.15 + t * 0.55 });
  }
  return pts;
}

/** Brand header + form card used by every sign-in screen. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { width } = useWindowDimensions();
  const dots = arcDots(width);
  const plane = dots[dots.length - 3];
  const logoW = Math.min(220, width * 0.56);

  return (
    <View style={styles.root}>
      {/* Decorative sky: soft glow + dotted flight path with a plane. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width={width} height={DECOR_H}>
          <Defs>
            <RadialGradient id="glow" cx="50%" cy="0%" r="75%">
              <Stop offset="0" stopColor={colors.accent} stopOpacity="0.22" />
              <Stop offset="0.6" stopColor={colors.bgGlow} stopOpacity="0.6" />
              <Stop offset="1" stopColor={colors.bg} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={width} height={DECOR_H} fill="url(#glow)" />
        </Svg>
      </View>

      <SafeAreaView style={styles.flex} edges={["top", "left", "right", "bottom"]}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.brand}>
              {/* Dotted flight path with a plane, arcing over the logo (same motif as the splash). */}
              <View pointerEvents="none" style={[styles.arc, { width, height: ARC_H, left: -space.lg }]}>
                <Svg width={width} height={ARC_H}>
                  {dots.slice(0, -3).map((d, i) => (
                    <Circle key={i} cx={d.x} cy={d.y} r={d.r} fill={colors.accent} opacity={d.o} />
                  ))}
                </Svg>
                <View style={[styles.plane, { left: plane.x - 12, top: plane.y - 14 }]}>
                  <Ionicons name="airplane" size={24} color={colors.accent} style={styles.planeIcon} />
                </View>
              </View>
              <Image
                source={require("../../../../assets/splash-logo.png")}
                style={{ width: logoW, height: logoW * LOGO_RATIO }}
                resizeMode="contain"
                accessibilityLabel="FlightOne"
              />
              <View style={styles.tagline}>
                <Ionicons name="sparkles" size={13} color={colors.accent} />
                <Text style={styles.taglineText}>Your AI travel consultant, Ava</Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={type.h1}>{title}</Text>
              {subtitle ? <Text style={[type.bodySoft, styles.subtitle]}>{subtitle}</Text> : null}
              <View style={styles.body}>{children}</View>
            </View>

            {footer ? <View style={styles.footer}>{footer}</View> : null}

            <View style={styles.secure}>
              <Ionicons name="lock-closed" size={12} color={colors.inkFaint} />
              <Text style={styles.secureText}>Secure sign-in</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", padding: space.lg, paddingVertical: space.xxl, gap: space.lg },
  plane: { position: "absolute" },
  planeIcon: { transform: [{ rotate: "20deg" }] },
  brand: { alignItems: "center", gap: space.sm, marginBottom: space.sm, paddingTop: ARC_H - 24 },
  arc: { position: "absolute", top: 0 },
  tagline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  taglineText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.inkSoft },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md + 10,
    padding: space.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    ...shadow,
    shadowOpacity: 0.12,
    shadowRadius: 24,
  },
  subtitle: { marginTop: space.xs },
  body: { gap: space.md, marginTop: space.lg },
  footer: { alignItems: "center", gap: space.xs },
  secure: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  secureText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.inkFaint },
});
