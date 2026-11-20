import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useAuthStore } from "@/core/auth/auth.store";
import { TINT } from "@/core/components";
import { colors, fonts, radius, shadow, space, type } from "@/core/theme/tokens";
import { CorporateModeBanner } from "@/features/corporate/components/CorporateModeBanner";
import { AvaAvatar } from "../components/AvaAvatar";
import { Composer, type Prefill } from "../components/Composer";
import { TripBar } from "../components/TripBar";
import { MessageBubble } from "../components/MessageBubble";
import { useAvaChat } from "../hooks/useAvaChat";
import { useTravellerLocation } from "../hooks/useTravellerLocation";
import { starterRoutes } from "../lib/starterRoutes";
import type { ChatMessage } from "../types";

type IconName = keyof typeof Ionicons.glyphMap;

const NIGHT = "#0b1219";
const CYAN = "#7fd3f7";
const GOLD = "#f5c26b";

/** Icon + tint for the starter cards, in `starterRoutes` order (one-way, round trip, multi-city). */
const STARTER_LOOK: { icon: IconName; fg: string; bg: string }[] = [
  { icon: "airplane", fg: TINT.blue.fg, bg: TINT.blue.bg },
  { icon: "repeat", fg: TINT.violet.fg, bg: TINT.violet.bg },
  { icon: "map", fg: TINT.teal.fg, bg: TINT.teal.bg },
];

/** A fixed scatter of stars (percent positions) for the night-sky welcome card. */
const STARS = (() => {
  const out: { x: number; y: number; r: number; o: number }[] = [];
  let seed = 11;
  const next = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (let i = 0; i < 32; i++) out.push({ x: next() * 100, y: next() * 100, r: 0.5 + next() * 1.1, o: 0.15 + next() * 0.55 });
  return out;
})();

export function AvaScreen() {
  const { location } = useTravellerLocation();
  const { messages, busy, phase, send, stop, retry, revealed, reset, open, restoring, plan } = useAvaChat(location);
  const [prefill, setPrefill] = useState<Prefill | null>(null);
  const prefillBox = (text: string) => setPrefill((p) => ({ text, key: (p?.key ?? 0) + 1 }));
  const lastUserId = [...messages].reverse().find((m) => m.role === "user")?.id;
  const lastId = messages[messages.length - 1]?.id;
  const name = useAuthStore((s) => s.user?.name?.split(" ")[0]);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const origin = location?.iata ? location.place : undefined;
  const starters = useMemo(() => starterRoutes(new Date(), origin), [origin]);
  const last = messages[messages.length - 1];

  // A search handed over from another screen (`/ava?q=…`), or a saved chat to reopen
  // (`/ava?chat=<id>`): act once, then clear the param.
  const { q, chat } = useLocalSearchParams<{ q?: string; chat?: string }>();
  useEffect(() => {
    if (!q || busy) return;
    router.setParams({ q: undefined });
    send(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  useEffect(() => {
    if (!chat) return;
    router.setParams({ chat: undefined });
    void open(chat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat]);

  // Stick to the bottom like a chat app: a new message (or a reopened chat) jumps
  // to the end, and while you're at the bottom the view follows Ava's answer as it
  // grows. Scroll up and it stays put, with a ↓ button to jump back down.
  const pinnedRef = useRef(true);
  const lastYRef = useRef(0);
  const [showJump, setShowJump] = useState(false);

  const jumpToBottom = (animated = true) => {
    pinnedRef.current = true;
    setShowJump(false);
    listRef.current?.scrollToEnd({ animated });
  };

  useEffect(() => {
    if (messages.length === 0) {
      pinnedRef.current = true;
      return;
    }
    const raf = requestAnimationFrame(() => jumpToBottom());
    return () => cancelAnimationFrame(raf);
  }, [messages.length, last?.pending]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const y = contentOffset.y;
    const scrolledUp = y < lastYRef.current - 2;
    lastYRef.current = y;
    const fromBottom = contentSize.height - layoutMeasurement.height - y;
    // Only the reader scrolling up un-pins; content growing below never does.
    if (fromBottom < 60) pinnedRef.current = true;
    else if (scrolledUp) pinnedRef.current = false;
    const jump = !pinnedRef.current && fromBottom > 120;
    setShowJump((prev) => (prev === jump ? prev : jump));
  };

  // "bottom" keeps the message box above the floating tab bar, which counts as safe area.
  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.header}>
        <View style={styles.brand}>
          <AvaAvatar size={38} online />
          <View style={styles.brandText}>
            <Text style={styles.title}>Ava</Text>
            <Text style={styles.subline} numberOfLines={1}>
              {busy ? "Working on it…" : "Online · AI travel consultant"}
            </Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Saved chats"
            onPress={() => router.push("/chats")}
            hitSlop={6}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          >
            <Ionicons name="time-outline" size={20} color={colors.ink} />
          </Pressable>
          {messages.length ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="New chat"
              onPress={reset}
              hitSlop={6}
              style={({ pressed }) => [styles.iconBtn, styles.iconBtnDark, pressed && styles.pressed]}
            >
              <Ionicons name="create-outline" size={19} color={colors.onBtn} />
            </Pressable>
          ) : null}
        </View>
      </View>
      <CorporateModeBanner />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {restoring && messages.length === 0 ? (
          <View style={[styles.flex, styles.center]}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : messages.length === 0 ? (
          <ScrollView style={styles.flex} contentContainerStyle={styles.empty} keyboardShouldPersistTaps="handled">
            <View style={styles.hero}>
              <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
                <Defs>
                  <LinearGradient id="avaHero" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor="#16283a" />
                    <Stop offset="1" stopColor={NIGHT} />
                  </LinearGradient>
                  <RadialGradient id="avaGlow" cx="50%" cy="20%" r="60%">
                    <Stop offset="0" stopColor={CYAN} stopOpacity={0.26} />
                    <Stop offset="1" stopColor={CYAN} stopOpacity={0} />
                  </RadialGradient>
                </Defs>
                <Rect x="0" y="0" width="100%" height="100%" fill="url(#avaHero)" />
                <Rect x="0" y="0" width="100%" height="100%" fill="url(#avaGlow)" />
                {STARS.map((st, i) => (
                  <Circle key={i} cx={`${st.x}%`} cy={`${st.y}%`} r={st.r} fill="#ffffff" opacity={st.o} />
                ))}
              </Svg>
              <View style={styles.heroAvatar}>
                <AvaAvatar size={60} />
              </View>
              <Text style={styles.heroTitle}>{name ? `Hi ${name}, where to?` : "Where to next?"}</Text>
              <Text style={styles.heroBody}>
                Tell Ava your trip in your own words: cities, dates, budget or cabin. She&apos;ll search live fares and stays and
                pick the best options.
              </Text>
              {origin ? (
                <View style={styles.originPill}>
                  <Ionicons name="location" size={13} color={GOLD} />
                  <Text style={styles.originText} numberOfLines={1}>
                    Flying from {origin}
                    {location?.iata ? ` (${location.iata})` : ""}
                  </Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.startersLabel}>Try one of these</Text>
            <View style={styles.starters}>
              {starters.map((s, i) => {
                const look = STARTER_LOOK[i % STARTER_LOOK.length];
                return (
                  <Pressable
                    key={s.title}
                    accessibilityRole="button"
                    accessibilityLabel={s.prompt}
                    onPress={() => send(s.prompt)}
                    style={({ pressed }) => [styles.starter, pressed && styles.starterPressed]}
                  >
                    <View style={[styles.starterIcon, { backgroundColor: look.bg }]}>
                      <Ionicons name={look.icon} size={20} color={look.fg} />
                    </View>
                    <View style={styles.flex}>
                      <Text style={styles.starterTitle} numberOfLines={1}>
                        {s.title}
                      </Text>
                      <Text style={styles.starterSub} numberOfLines={1}>
                        {s.subtitle}
                      </Text>
                    </View>
                    <View style={styles.starterGo}>
                      <Ionicons name="arrow-forward" size={16} color={colors.ink} />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        ) : (
          <View style={styles.flex}>
            <FlatList
              ref={listRef}
              style={styles.flex}
              data={messages}
              keyExtractor={(m) => m.id}
              contentContainerStyle={styles.list}
              keyboardShouldPersistTaps="handled"
              onScroll={onScroll}
              scrollEventThrottle={32}
              onContentSizeChange={() => {
                if (pinnedRef.current) listRef.current?.scrollToEnd({ animated: true });
              }}
              renderItem={({ item }) => (
                <MessageBubble
                  message={item}
                  phase={item.pending ? phase : null}
                  onFollowUp={send}
                  onRevealed={revealed}
                  onRetry={item.failed && item.id === lastId && !busy ? retry : undefined}
                  onEdit={item.id === lastUserId && !busy ? () => prefillBox(item.content) : undefined}
                />
              )}
            />
            {showJump ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Scroll to latest message"
                onPress={() => jumpToBottom()}
                hitSlop={8}
                style={({ pressed }) => [styles.jump, pressed && styles.pressed]}
              >
                <Ionicons name="arrow-down" size={20} color={colors.ink} />
              </Pressable>
            ) : null}
          </View>
        )}
        {messages.length ? <TripBar plan={plan} disabled={busy} onSend={send} onPrefill={prefillBox} /> : null}
        <Composer busy={busy} onSend={send} onStop={stop} prefill={prefill} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.md,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: space.md, flexShrink: 1 },
  brandText: { flexShrink: 1 },
  title: { fontFamily: fonts.display, fontSize: 20, lineHeight: 24, color: colors.ink },
  subline: { fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 16, color: colors.inkSoft },
  headerActions: { flexDirection: "row", alignItems: "center", gap: space.sm },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  iconBtnDark: { backgroundColor: colors.btn, borderColor: colors.btn },
  center: { alignItems: "center", justifyContent: "center" },
  empty: { paddingHorizontal: space.lg, paddingTop: space.xs, paddingBottom: space.xl, gap: space.md },
  hero: {
    borderRadius: 26,
    overflow: "hidden",
    backgroundColor: NIGHT,
    alignItems: "center",
    paddingHorizontal: space.xl,
    paddingTop: space.xl + 4,
    paddingBottom: space.xl,
    gap: space.sm,
  },
  heroAvatar: {
    marginBottom: space.sm,
    borderRadius: 20,
    shadowColor: CYAN,
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  heroTitle: { fontFamily: fonts.display, fontSize: 24, lineHeight: 30, color: "#ffffff", textAlign: "center" },
  heroBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: "rgba(255,255,255,0.72)",
    textAlign: "center",
    maxWidth: 320,
  },
  originPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: space.sm,
    maxWidth: "100%",
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.09)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: space.md,
    paddingVertical: 6,
  },
  originText: { flexShrink: 1, fontFamily: fonts.bodySemi, fontSize: 13, color: "#ffffff" },
  startersLabel: { ...type.tag, color: colors.inkSoft, marginTop: space.sm, marginLeft: space.xs },
  starters: { gap: space.sm },
  starter: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.card,
    borderRadius: radius.md + 4,
    padding: space.md,
    minHeight: 68,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  starterPressed: { backgroundColor: "#f7fafc", transform: [{ scale: 0.99 }] },
  starterIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  starterTitle: { fontFamily: fonts.displaySemi, fontSize: 15, lineHeight: 21, color: colors.ink },
  starterSub: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.inkSoft },
  starterGo: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  pressed: { opacity: 0.85 },
  list: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.lg, gap: space.lg + 2 },
  jump: {
    position: "absolute",
    bottom: space.md,
    alignSelf: "center",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    ...shadow,
  },
});
