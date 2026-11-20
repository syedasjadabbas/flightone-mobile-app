import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Stack, router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ActionMenu, Button, EmptyState, Notice, Screen, SkeletonList, TINT } from "@/core/components";
import { formatApiError } from "@/core/api/formatApiError";
import { confirmAction } from "@/core/lib/confirm";
import { colors, fonts, radius, space, type } from "@/core/theme/tokens";
import { isAvaChat, useConversationsQuery, useDeleteConversationMutation, type ConversationSummary } from "../api/conversationsApi";

const DAY_MS = 86_400_000;
const GROUPS = ["Today", "Yesterday", "This week", "Earlier"] as const;
type Group = (typeof GROUPS)[number];

const stamp = (c: ConversationSummary) => c.updatedAt || c.createdAt;
const titleOf = (c: ConversationSummary) => c.title || "Chat with Ava";

function groupOf(iso: string, now: Date): Group {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const t = new Date(iso).getTime();
  if (Number.isNaN(t) || t >= startOfToday) return "Today";
  if (t >= startOfToday - DAY_MS) return "Yesterday";
  if (t >= startOfToday - 6 * DAY_MS) return "This week";
  return "Earlier";
}

/** "Just now", "12m ago", "3:45 pm", "Mon", "4 Nov". */
function relative(iso: string, now: Date) {
  const d = new Date(iso);
  const diff = now.getTime() - d.getTime();
  if (Number.isNaN(diff)) return "";
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  const group = groupOf(iso, now);
  if (group === "Today") return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (group === "Yesterday") return "Yesterday";
  if (group === "This week") return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], {
    day: "numeric",
    month: "short",
    ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  });
}

/** Saved Ava chats (same list the web's chat sidebar shows), grouped by date and searchable. */
export function ChatsScreen() {
  const { data, isLoading, error, refetch } = useConversationsQuery();
  const [remove] = useDeleteConversationMutation();
  const [query, setQuery] = useState("");
  const chats = useMemo(() => (data?.items ?? []).filter(isAvaChat), [data]);

  const needle = query.trim().toLowerCase();
  const sections = useMemo(() => {
    const now = new Date();
    const matches = chats
      .filter((c) => !needle || titleOf(c).toLowerCase().includes(needle))
      .sort((a, b) => new Date(stamp(b)).getTime() - new Date(stamp(a)).getTime());
    const byGroup = new Map<Group, ConversationSummary[]>();
    for (const c of matches) {
      const g = groupOf(stamp(c), now);
      byGroup.set(g, [...(byGroup.get(g) ?? []), c]);
    }
    return GROUPS.filter((g) => byGroup.has(g)).map((g) => ({ title: g, items: byGroup.get(g) ?? [], now }));
  }, [chats, needle]);

  const deleteChat = async (c: ConversationSummary) => {
    if (await confirmAction("Delete chat?", c.title || "This chat will be removed.", "Delete")) remove(c.id);
  };

  return (
    <Screen edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: "Saved chats" }} />

      {chats.length ? (
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.inkFaint} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search your chats"
            placeholderTextColor={colors.inkFaint}
            accessibilityLabel="Search saved chats"
            autoCorrect={false}
            returnKeyType="search"
            style={styles.searchInput}
          />
          {query ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery("")} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={colors.inkFaint} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {isLoading ? <SkeletonList count={6} iconSize={40} /> : null}
      {error ? (
        <>
          <Notice message={formatApiError(error, "We couldn't load your chats.")} />
          <Button label="Retry" variant="ghost" onPress={() => refetch()} />
        </>
      ) : null}
      {!isLoading && !error && !chats.length ? (
        <EmptyState
          icon="chatbubbles-outline"
          title="No saved chats yet"
          body="Your conversations with Ava are saved here automatically, so you can pick up where you left off."
          actionLabel="Ask Ava"
          onAction={() => router.navigate("/ava")}
        />
      ) : null}
      {chats.length && !sections.length ? (
        <EmptyState icon="search-outline" tint="slate" title="No matching chats" body={`Nothing saved matches “${query.trim()}”.`} />
      ) : null}

      {sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionLabel}>{section.title}</Text>
          <View style={styles.card}>
            {section.items.map((c, i) => (
              <View key={c.id} style={[styles.row, i > 0 && styles.divider]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open chat ${c.title || "Untitled"}`}
                  onPress={() => router.navigate({ pathname: "/ava", params: { chat: c.id } })}
                  style={({ pressed }) => [styles.main, pressed && styles.pressed]}
                >
                  <View style={styles.icon}>
                    <Ionicons name="chatbubble-ellipses" size={18} color={TINT.blue.fg} />
                  </View>
                  <View style={styles.text}>
                    <Text style={styles.title} numberOfLines={2}>
                      {titleOf(c)}
                    </Text>
                    <Text style={styles.time}>{relative(stamp(c), section.now)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
                </Pressable>
                <ActionMenu
                  title={titleOf(c)}
                  accessibilityLabel={`More actions for chat ${c.title || "Untitled"}`}
                  actions={[{ label: "Delete chat", icon: "trash-outline", destructive: true, onPress: () => void deleteChat(c) }]}
                />
              </View>
            ))}
          </View>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    minHeight: 46,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    paddingHorizontal: space.lg,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontFamily: fonts.body, fontSize: 15, color: colors.ink },
  section: { gap: space.sm },
  sectionLabel: { ...type.tag, color: colors.inkSoft, marginLeft: space.xs },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md + 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    paddingLeft: space.md,
    paddingRight: space.sm,
  },
  row: { flexDirection: "row", alignItems: "center", gap: space.xs, minHeight: 64 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  main: { flex: 1, flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.md },
  pressed: { opacity: 0.7 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: TINT.blue.bg },
  text: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 20, color: colors.ink },
  time: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16, color: colors.inkFaint },
});
