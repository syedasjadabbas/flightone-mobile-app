import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, fonts, radius, space } from "@/core/theme/tokens";
import type { AvaPhase, ChatMessage } from "../types";
import { AvaAvatar } from "./AvaAvatar";
import { ProgressCard } from "./ProgressCard";
import { ResultsSummaryCard } from "./ResultsSummaryCard";

/**
 * Types a reply out word by word (about 1.5 s at most, however long it is),
 * then calls `onDone`. Inactive → the full text straight away.
 */
function useTypewriter(text: string, active: boolean, onDone: () => void) {
  const [shown, setShown] = useState(active ? 0 : Number.MAX_SAFE_INTEGER);
  const parts = text.split(/(\s+)/);
  useEffect(() => {
    if (!active) return;
    const perTick = Math.max(1, Math.ceil(parts.length / 50));
    let n = 0;
    const timer = setInterval(() => {
      n += perTick;
      setShown(n);
      if (n >= parts.length) {
        clearInterval(timer);
        onDone();
      }
    }, 28);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, text]);
  const done = !active || shown >= parts.length;
  return { text: done ? text : parts.slice(0, shown).join(""), done };
}

/** Long-press any bubble to copy it. Shows "Copied" for a moment. */
function useCopy(text: string) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(t);
  }, [copied]);
  const copy = async () => {
    await Clipboard.setStringAsync(text).catch(() => {});
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setCopied(true);
  };
  return { copied, copy };
}

export function MessageBubble({
  message,
  phase,
  onFollowUp,
  onRetry,
  onEdit,
  onRevealed,
}: {
  message: ChatMessage;
  phase: AvaPhase | null;
  onFollowUp: (text: string) => void;
  /** Shown on a failed reply: ask the same question again. */
  onRetry?: () => void;
  /** Shown under your last question: put it back in the message box. */
  onEdit?: () => void;
  onRevealed?: (id: string) => void;
}) {
  const typing = useTypewriter(message.content, Boolean(message.reveal), () => onRevealed?.(message.id));
  const { copied, copy } = useCopy(message.content);

  if (message.role === "user") {
    return (
      <View style={styles.userWrap}>
        <Pressable
          onLongPress={copy}
          delayLongPress={350}
          accessibilityRole="text"
          accessibilityHint="Long-press to copy"
          style={[styles.bubble, styles.user]}
        >
          <Text style={styles.userText}>{message.content}</Text>
        </Pressable>
        {copied ? <Text style={styles.copied}>Copied</Text> : null}
        {onEdit && !copied ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit your question"
            onPress={onEdit}
            hitSlop={8}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
          >
            <Ionicons name="create-outline" size={13} color={colors.inkSoft} />
            <Text style={styles.actionText}>Edit</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.assistantWrap}>
      <View style={styles.avaRow}>
        <View style={styles.avatar}>
          <AvaAvatar size={AVATAR} />
        </View>
        <View style={styles.avaCol}>
          <Pressable
            onLongPress={message.pending ? undefined : copy}
            delayLongPress={350}
            accessibilityHint={message.pending ? undefined : "Long-press to copy"}
            style={[styles.bubble, styles.assistant, message.pending && !message.content && styles.pendingBubble, message.failed && styles.failed]}
          >
            {message.pending && !message.content ? (
              <ProgressCard phase={phase} />
            ) : (
              <Text style={[styles.assistantText, message.failed && styles.failedText]}>{typing.text}</Text>
            )}
          </Pressable>
          {copied ? <Text style={[styles.copied, styles.copiedLeft]}>Copied</Text> : null}
          {message.failed && onRetry ? (
            <Pressable accessibilityRole="button" onPress={onRetry} style={({ pressed }) => [styles.retry, pressed && styles.pressed]} hitSlop={6}>
              <Ionicons name="refresh" size={15} color={colors.accent} />
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      {typing.done && message.panel ? <ResultsSummaryCard id={message.id} panel={message.panel} /> : null}
      {typing.done && message.followUps?.length ? (
        <View style={styles.chips}>
          {message.followUps.slice(0, 4).map((s) => (
            <Pressable
              key={s}
              accessibilityRole="button"
              onPress={() => onFollowUp(s)}
              style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
              hitSlop={4}
            >
              <Ionicons name="return-down-forward" size={13} color={colors.accent} />
              <Text style={styles.chipText} numberOfLines={2}>
                {s}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const AVATAR = 26;
const GUTTER = AVATAR + space.sm;

const styles = StyleSheet.create({
  bubble: { borderRadius: 20, paddingHorizontal: space.lg, paddingVertical: space.md, maxWidth: "88%" },
  user: { alignSelf: "flex-end", backgroundColor: colors.ink, borderBottomRightRadius: 6 },
  userWrap: { alignItems: "flex-end", gap: 6 },
  action: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 6, paddingVertical: 2 },
  actionText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.inkSoft },
  copied: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.success, paddingHorizontal: 4 },
  copiedLeft: { marginLeft: space.xs },
  retry: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.card,
    paddingHorizontal: space.md,
    paddingVertical: 7,
  },
  retryText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.accent },
  userText: { fontFamily: fonts.body, fontSize: 15, lineHeight: 23, color: colors.onBtn },
  assistantWrap: { gap: space.sm, alignSelf: "stretch" },
  avaRow: { flexDirection: "row", alignItems: "flex-start", gap: space.sm },
  avatar: { paddingTop: 2 },
  avaCol: { flex: 1, gap: space.sm, alignItems: "flex-start" },
  assistant: {
    alignSelf: "flex-start",
    maxWidth: "100%",
    backgroundColor: colors.card,
    borderTopLeftRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  pendingBubble: { alignSelf: "stretch" },
  assistantText: { fontFamily: fonts.body, fontSize: 15, lineHeight: 23, color: colors.ink },
  failed: { backgroundColor: colors.dangerSoft, borderColor: colors.dangerSoft },
  failedText: { color: colors.danger },
  pressed: { opacity: 0.8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginLeft: GUTTER },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: "100%",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(10, 134, 192, 0.22)",
    backgroundColor: colors.card,
    paddingHorizontal: space.md + 2,
    paddingVertical: space.sm,
    minHeight: 36,
  },
  chipPressed: { backgroundColor: colors.accentSoft },
  chipText: { flexShrink: 1, fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 18, color: colors.accent },
});
