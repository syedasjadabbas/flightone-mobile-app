import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Stack, router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Button, Card, EmptyState, Notice, Screen } from "@/core/components";
import { formatApiError } from "@/core/api/formatApiError";
import { confirmAction } from "@/core/lib/confirm";
import { colors, space, type } from "@/core/theme/tokens";
import { isAvaChat, useConversationsQuery, useDeleteConversationMutation } from "../api/conversationsApi";

function when(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  return d.toDateString() === today.toDateString()
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString([], { day: "numeric", month: "short" });
}

/** Saved Ava chats (same list the web's chat sidebar shows). */
export function ChatsScreen() {
  const { data, isLoading, error, refetch } = useConversationsQuery();
  const [remove] = useDeleteConversationMutation();
  const chats = (data?.items ?? []).filter(isAvaChat);

  return (
    <Screen edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: "Saved chats" }} />
      {isLoading ? <ActivityIndicator color={colors.accent} /> : null}
      {error ? (
        <>
          <Notice message={formatApiError(error, "We couldn't load your chats.")} />
          <Button label="Retry" variant="ghost" onPress={() => refetch()} />
        </>
      ) : null}
      {!isLoading && !error && !chats.length ? (
        <EmptyState title="No saved chats yet" body="Your conversations with Ava are saved here automatically." />
      ) : null}
      {chats.length ? (
        <Card style={styles.card}>
          {chats.map((c, i) => (
            <View key={c.id} style={[styles.row, i > 0 && styles.divider]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open chat ${c.title || "Untitled"}`}
                onPress={() => router.navigate({ pathname: "/ava", params: { chat: c.id } })}
                style={styles.main}
              >
                <Text style={type.label} numberOfLines={2}>
                  {c.title || "Chat with Ava"}
                </Text>
                <Text style={type.bodySoft}>{when(c.updatedAt)}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Delete chat ${c.title || "Untitled"}`}
                hitSlop={10}
                onPress={async () => {
                  if (await confirmAction("Delete chat?", c.title || "This chat will be removed.", "Delete")) remove(c.id);
                }}
              >
                <Ionicons name="trash-outline" size={20} color={colors.inkFaint} />
              </Pressable>
            </View>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: space.xs, gap: 0 },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.md, minHeight: 56 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  main: { flex: 1, gap: 2 },
});
