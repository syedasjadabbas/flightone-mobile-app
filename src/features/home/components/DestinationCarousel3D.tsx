import { useAnimValue } from "@/core/hooks/useAnimValue";
import { Animated, Dimensions, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius, shadow, space } from "@/core/theme/tokens";
import type { HomeDestination } from "../lib/destinations";

const SCREEN = Dimensions.get("window").width;
const CARD_W = Math.min(280, SCREEN * 0.68);
const CARD_H = CARD_W * 1.22;
const GAP = space.md;
const STEP = CARD_W + GAP;
const SIDE = (SCREEN - CARD_W) / 2;

/**
 * Swipeable destination cards that turn in 3D as they move:
 * the centred card faces you, neighbours swing away on the Y axis.
 */
export function DestinationCarousel3D({ items, onPick }: { items: HomeDestination[]; onPick: (d: HomeDestination) => void }) {
  const scrollX = useAnimValue(0);

  return (
    <Animated.ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={STEP}
      decelerationRate="fast"
      contentContainerStyle={{ paddingHorizontal: SIDE, gap: GAP, paddingVertical: space.md }}
      onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
      scrollEventThrottle={16}
    >
      {items.map((d, i) => {
        const input = [(i - 1) * STEP, i * STEP, (i + 1) * STEP];
        const rotateY = scrollX.interpolate({ inputRange: input, outputRange: ["38deg", "0deg", "-38deg"], extrapolate: "clamp" });
        const scale = scrollX.interpolate({ inputRange: input, outputRange: [0.86, 1, 0.86], extrapolate: "clamp" });
        const lift = scrollX.interpolate({ inputRange: input, outputRange: [14, 0, 14], extrapolate: "clamp" });
        const shade = scrollX.interpolate({ inputRange: input, outputRange: [0.35, 0, 0.35], extrapolate: "clamp" });
        return (
          <Animated.View
            key={d.code}
            style={[styles.card, { transform: [{ perspective: 900 }, { translateY: lift }, { rotateY }, { scale }] }]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${d.city}, ${d.country}, flights from ${d.priceFrom}. Ask Ava.`}
              onPress={() => onPick(d)}
              style={styles.fill}
            >
              <Image source={{ uri: d.image }} style={styles.image} resizeMode="cover" />
              <View style={styles.scrim} />
              <View style={styles.info}>
                <Text style={styles.code}>{d.code}</Text>
                <Text style={styles.city}>{d.city}</Text>
                <Text style={styles.country}>{d.country}</Text>
                <View style={styles.price}>
                  <Text style={styles.priceText}>from {d.priceFrom}</Text>
                </View>
              </View>
              <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.shade, { opacity: shade }]} />
            </Pressable>
          </Animated.View>
        );
      })}
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { width: CARD_W, height: CARD_H, borderRadius: radius.md + 6, backgroundColor: colors.ink, ...shadow, shadowOpacity: 0.18 },
  fill: { flex: 1, borderRadius: radius.md + 6, overflow: "hidden" },
  image: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  scrim: { position: "absolute", left: 0, right: 0, bottom: 0, height: "55%", backgroundColor: "rgba(11,18,25,0.55)" },
  shade: { backgroundColor: colors.ink, borderRadius: radius.md + 6 },
  info: { position: "absolute", left: space.lg, right: space.lg, bottom: space.lg, gap: 2 },
  code: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 2, color: "rgba(255,255,255,0.75)" },
  city: { fontFamily: fonts.display, fontSize: 26, color: "#fff" },
  country: { fontFamily: fonts.body, fontSize: 13, color: "rgba(255,255,255,0.85)" },
  price: { alignSelf: "flex-start", marginTop: space.sm, backgroundColor: "rgba(255,255,255,0.92)", borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: 5 },
  priceText: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.ink },
});
