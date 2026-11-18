import { useEffect, useMemo, useRef } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";
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

  // While Ava is thinking, keep the bottom in view; when her answer lands,
  // scroll to the top of it so the reply is read before the result cards.
  useEffect(() => {
    if (!last) return;
    const list = listRef.current;
    if (!list) return;
    if (last.pending) {
      list.scrollToEnd({ animated: true });
    } else if (last.role === "assistant") {
      const index = messages.length - 1;
      requestAnimationFrame(() => list.scrollToIndex({ index, viewPosition: 0, animated: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, last?.pending]);

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
              Tell Ava your trip in your own words: cities, dates, budget, airline or cabin. She'll search live fares and
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
          <FlatList
            ref={listRef}
            style={styles.flex}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            onScrollToIndexFailed={({ index }) =>
              setTimeout(() => listRef.current?.scrollToIndex({ index, viewPosition: 0, animated: true }), 120)
            }
            renderItem={({ item }) => (
              <MessageBubble message={item} phase={item.pending ? phase : null} onFollowUp={send} />
            )}
          />
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
});
