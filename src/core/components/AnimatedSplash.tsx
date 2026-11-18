import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from "react-native";
import { useAnimValue } from "@/core/hooks/useAnimValue";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as SplashScreen from "expo-splash-screen";
import { colors, fonts } from "@/core/theme/tokens";

/**
 * Animated intro that takes over from the native splash.
 *
 * The native splash (app.json → expo-splash-screen) shows the same logo, same
 * size, same centre, on the same sky background — so the handoff is invisible.
 * Once the app is ready we play: a plane arcs over the logo leaving a dotted
 * trail → the logo's sparkle twinkles → tagline rises in → the whole splash
 * lifts away to reveal the app. "Reduce Motion" gets a plain fade.
 */

const LOGO_WIDTH = 240; // must match app.json expo-splash-screen.imageWidth
const LOGO_RATIO = 284 / 878; // assets/splash-logo.png
const LOGO_HEIGHT = LOGO_WIDTH * LOGO_RATIO;
// Where the cyan sparkle sits in the logo artwork, relative to the logo centre.
const SPARKLE = { x: (818 / 878 - 0.5) * LOGO_WIDTH, y: (225 / 284 - 0.5) * LOGO_HEIGHT };

// The plane's flight path (relative to the logo centre): low left → over the top → off to the right.
const PATH_T = [0, 0.25, 0.5, 0.75, 1];
const PATH_X = [-185, -95, 0, 105, 200];
const PATH_Y = [52, -38, -78, -66, -24];
const PATH_ANGLE = ["-58deg", "-30deg", "0deg", "22deg", "38deg"]; // nose follows the arc (icon points up-right at 0)
const NAME = "FlightOne".split("");
const TRAIL =Array.from({ length: 9 }, (_, i) => (i + 1) / 11);

const lerp = (t: number, xs: number[]) => {
  for (let i = 1; i < PATH_T.length; i++) {
    if (t <= PATH_T[i]) {
      const k = (t - PATH_T[i - 1]) / (PATH_T[i] - PATH_T[i - 1]);
      return xs[i - 1] + (xs[i] - xs[i - 1]) * k;
    }
  }
  return xs[xs.length - 1];
};

export function AnimatedSplash({ ready, onFinish }: { ready: boolean; onFinish: () => void }) {
  const flight = useAnimValue(0);
  const sparkle = useAnimValue(0);
  const tagline = useAnimValue(0);
  const write = useAnimValue(0);
  const exit = useAnimValue(0);
  const breathe = useAnimValue(0);
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const started = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => setReduceMotion(false));
  }, []);

  // Gentle breathing while the app is still loading (only if it takes a moment).
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breathe]);

  useEffect(() => {
    if (!ready || reduceMotion === null || started.current) return;
    started.current = true;
    breathe.stopAnimation();
    breathe.setValue(0);

    if (reduceMotion) {
      Animated.timing(exit, { toValue: 1, duration: 260, useNativeDriver: true }).start(() => onFinish());
      return;
    }

    Animated.sequence([
      Animated.parallel([
        Animated.timing(flight, { toValue: 1, duration: 1050, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(520),
          Animated.timing(sparkle, { toValue: 1, duration: 520, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.delay(250),
          Animated.timing(write, { toValue: NAME.length, duration: 720, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(tagline, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]),
      ]),
      Animated.delay(450),
      Animated.timing(exit, { toValue: 1, duration: 420, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(() => onFinish());
  }, [ready, reduceMotion, breathe, exit, flight, sparkle, tagline, write, onFinish]);

  const planeX = flight.interpolate({ inputRange: PATH_T, outputRange: PATH_X });
  const planeY = flight.interpolate({ inputRange: PATH_T, outputRange: PATH_Y });
  const planeAngle = flight.interpolate({ inputRange: PATH_T, outputRange: PATH_ANGLE });
  const planeOpacity = flight.interpolate({ inputRange: [0, 0.08, 0.86, 1], outputRange: [0, 1, 1, 0] });

  const logoScale = Animated.add(
    breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] }),
    exit.interpolate({ inputRange: [0, 1], outputRange: [0, 0.12] }),
  );
  const fadeOut = exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  return (
    <Animated.View
      pointerEvents={ready ? "none" : "auto"}
      style={[StyleSheet.absoluteFill, styles.root, { opacity: fadeOut }]}
      accessibilityLabel="FlightOne is loading"
      accessibilityRole="image"
    >
      <View style={styles.stage}>
        {/* Dotted trail the plane leaves behind */}
        {TRAIL.map((t) => (
          <Animated.View
            key={t}
            style={[
              styles.dot,
              {
                transform: [{ translateX: lerp(t, PATH_X) }, { translateY: lerp(t, PATH_Y) + 8 }],
                // Each dot pops in fully solid as the plane passes and stays solid.
                opacity: flight.interpolate({ inputRange: [t - 0.001, t], outputRange: [0, 1], extrapolate: "clamp" }),
              },
            ]}
          />
        ))}

        <Animated.Image
          source={require("../../../assets/splash-logo.png")}
          style={[styles.logo, { transform: [{ scale: logoScale }] }]}
          resizeMode="contain"
          onLoadEnd={() => SplashScreen.hideAsync().catch(() => {})}
          accessibilityIgnoresInvertColors
        />

        {/* Sparkle twinkle over the logo's own sparkle */}
        <Animated.View
          style={[
            styles.sparkle,
            {
              opacity: sparkle.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 0] }),
              transform: [
                { translateX: SPARKLE.x },
                { translateY: SPARKLE.y },
                { scale: sparkle.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.2, 1.5, 0.6] }) },
                { rotate: sparkle.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "90deg"] }) },
              ],
            },
          ]}
        >
          <Ionicons name="sparkles" size={18} color={colors.accent} />
        </Animated.View>

        {/* The plane */}
        <Animated.View
          style={[
            styles.plane,
            { opacity: planeOpacity, transform: [{ translateX: planeX }, { translateY: planeY }, { rotate: planeAngle }] },
          ]}
        >
          <Ionicons name="airplane" size={26} color={colors.ink} style={styles.planeIcon} />
        </Animated.View>

        {/* The name, written letter by letter: "Flight" in ink, "One" in brand cyan */}
        <View style={styles.name} accessibilityLabel="FlightOne">
          {ready
            ? NAME.map((ch, i) => (
                <Animated.Text
                  key={i}
                  style={[
                    styles.nameText,
                    i >= 6 && styles.nameOne,
                    {
                      opacity: write.interpolate({ inputRange: [i, i + 1], outputRange: [0, 1], extrapolate: "clamp" }),
                      transform: [{ translateY: write.interpolate({ inputRange: [i, i + 1], outputRange: [6, 0], extrapolate: "clamp" }) }],
                    },
                  ]}
                >
                  {ch}
                </Animated.Text>
              ))
            : null}
        </View>

        <Animated.View
          style={[
            styles.tagline,
            {
              opacity: tagline,
              transform: [{ translateY: tagline.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
            },
          ]}
        >
          {ready ? <Text style={styles.taglineText}>Your AI travel consultant</Text> : null}
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.bg, zIndex: 1000, elevation: 1000 },
  stage: { flex: 1, alignItems: "center", justifyContent: "center" },
  logo: { width: LOGO_WIDTH, height: LOGO_HEIGHT },
  dot: { position: "absolute", width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.accent },
  sparkle: { position: "absolute" },
  plane: { position: "absolute" },
  // Ionicons "airplane" points to the upper-right; turn it to fly level-right at angle 0.
  planeIcon: { transform: [{ rotate: "45deg" }] },
  name: { position: "absolute", top: "50%", marginTop: LOGO_HEIGHT / 2 + 18, flexDirection: "row" },
  nameText: { fontFamily: fonts.display, fontSize: 30, letterSpacing: 0.5, color: colors.ink },
  nameOne: { color: colors.accent },
  tagline: { position: "absolute", top: "50%", marginTop: LOGO_HEIGHT / 2 + 64 },
  taglineText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.inkSoft, letterSpacing: 0.3 },
});
