import { useEffect, useState } from "react";
import { ActivityIndicator, Animated, AppState, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch } from "react-redux";
import Ionicons from "@expo/vector-icons/Ionicons";
import { baseApi } from "@/core/api/baseApi";
import { useConnectionStore } from "@/core/api/connection.store";
import { TAGS } from "@/core/constants/api";
import { useAnimValue } from "@/core/hooks/useAnimValue";
import { colors, fonts, radius, space } from "@/core/theme/tokens";

/**
 * One app-wide notice when the FlightOne server can't be reached (no internet,
 * server down, or the dev server's address changed), instead of an error on
 * every screen. Retry reloads everything; coming back to the app retries too.
 */
export function ConnectionBanner() {
  const reachable = useConnectionStore((s) => s.reachable);
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const [retrying, setRetrying] = useState(false);
  const slide = useAnimValue(0);

  useEffect(() => {
    Animated.timing(slide, {
      toValue: reachable ? 0 : 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [reachable, slide]);

  const retry = () => {
    setRetrying(true);
    dispatch(baseApi.util.invalidateTags([...TAGS]));
    setTimeout(() => setRetrying(false), 1500);
  };

  // Retry automatically when the app comes back to the foreground while offline.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active" && !useConnectionStore.getState().reachable) dispatch(baseApi.util.invalidateTags([...TAGS]));
    });
    return () => sub.remove();
  }, [dispatch]);

  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [-140, 0] });

  return (
    <Animated.View
      pointerEvents={reachable ? "none" : "box-none"}
      style={[styles.wrap, { paddingTop: insets.top + space.xs, transform: [{ translateY }], opacity: slide }]}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.banner} accessibilityRole="alert">
        <View style={styles.icon}>
          <Ionicons name="cloud-offline" size={17} color="#fff" />
        </View>
        <View style={styles.flex}>
          <Text style={styles.title}>Can&apos;t reach FlightOne</Text>
          <Text style={styles.sub} numberOfLines={1}>
            Check your connection. We&apos;ll keep what you have.
          </Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Retry" onPress={retry} disabled={retrying} hitSlop={8} style={({ pressed }) => [styles.retry, pressed && styles.pressed]}>
          {retrying ? <ActivityIndicator size="small" color={colors.night} /> : <Text style={styles.retryText}>Retry</Text>}
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, top: 0, paddingHorizontal: space.md, zIndex: 900, elevation: 20 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.night,
    borderRadius: radius.md + 4,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  flex: { flex: 1 },
  icon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.danger, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.bodySemi, fontSize: 14, color: "#fff" },
  sub: { fontFamily: fonts.body, fontSize: 12, color: "rgba(255,255,255,0.7)" },
  retry: { minWidth: 64, height: 34, borderRadius: radius.pill, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", paddingHorizontal: space.md },
  retryText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.night },
  pressed: { opacity: 0.8 },
});
