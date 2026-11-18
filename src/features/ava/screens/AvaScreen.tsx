import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, type NativeScrollEvent, type NativeSyntheticEvent, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useAuthStore } from "@/core/auth/auth.store";
import { colors, fonts, radius, shadow, space, type } from "@/core/theme/tokens";
import { CorporateModeBanner } from "@/features/corporate/components/CorporateModeBanner";
import { Composer } from "../components/Composer";
import { MessageBubble } from "../components/MessageBubble";
import { useAvaChat } from "../hooks/useAvaChat";
import { useTravellerLocation } from "../hooks/useTravellerLocation";
import { starterRoutes } from "../lib/starterRoutes";
import type { ChatMessage } from "../types";

export function AvaScreen() {
  const { location } = useTravellerLocation();
  const { messages, busy, phase, send, stop, reset, open, restoring } = useAvaChat(location);
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

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Text style={type.h2}>Ava</Text>
        <View style={styles.headerActions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Saved chats" onPress={() => router.push("/chats")} hitSlop={10}>
            <Ionicons name="time-outline" size={22} color={colors.ink} />
          </Pressable>
          {messages.length ? (
            <Pressable accessibilityRole="button" accessibilityLabel="New chat" onPress={reset} hitSlop={10}>
              <Ionicons name="create-outline" size={22} color={colors.accent} />
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
          <View style={[styles.flex, styles.empty]}>
            <Text style={type.h1}>{name ? `Hi ${name}, where to?` : "Where to next?"}</Text>
            {origin ? <Text style={styles.near}>Flying from {origin}{location?.iata ? ` (${location.iata})` : ""}</Text> : null}
            <Text style={type.bodySoft}>
              Tell Ava your trip in your own words: cities, dates, budget, airline or cabin. She&apos;ll search live fares and
              stays and pick the best options.
            </Text>
            <View style={styles.starters}>
              {starters.map((s) => (
                <Pressable
                  key={s.title}
                  accessibilityRole="button"
                  accessibilityLabel={s.prompt}
                  onPress={() => send(s.prompt)}
                  style={({ pressed }) => [styles.starter, pressed && styles.pressed]}
                >
                  <Text style={type.h3}>{s.title}</Text>
                  <Text style={type.bodySoft}>{s.subtitle}</Text>
                </Pressable>
              ))}
            </View>
          </View>
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
                <MessageBubble message={item} phase={item.pending ? phase : null} onFollowUp={send} />
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
        <Composer busy={busy} onSend={send} onStop={stop} />
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
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  headerActions: { flexDirection: "row", alignItems: "center", gap: space.lg },
  center: { alignItems: "center", justifyContent: "center" },
  near: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.accent },
  empty: { padding: space.lg, gap: space.md },
  starters: { gap: space.md, marginTop: space.sm },
  starter: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: space.lg,
    gap: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    ...shadow,
  },
  pressed: { opacity: 0.9 },
  list: { padding: space.lg, gap: space.lg },
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
