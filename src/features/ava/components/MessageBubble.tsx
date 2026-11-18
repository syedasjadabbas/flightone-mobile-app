import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, fonts, radius, space } from "@/core/theme/tokens";
import type { AvaPhase, ChatMessage } from "../types";
import { ResultsPanel } from "./ResultsPanel";

/**
 * The engine only reports "extract" until the supplier search returns (often
 * 20–30 s), so like the web's progress card we step through these on a timer.
 */
const PROGRESS_STEPS = [
  "Understanding your trip…",
  "Searching live fares…",
  "Comparing airlines and prices…",
  "Checking baggage and fare rules…",
  "Picking the best options…",
];
const STEP_MS = 4500;

const PHASE_TEXT: Partial<Record<AvaPhase, string>> = {
  reply: "Putting your options together…",
  done: "Almost there…",
};

function ThinkingText({ phase }: { phase: AvaPhase | null }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, PROGRESS_STEPS.length - 1)), STEP_MS);
    return () => clearInterval(timer);
  }, []);
  const text = (phase && PHASE_TEXT[phase]) || PROGRESS_STEPS[step];
  return <Text style={styles.thinkingText}>{text}</Text>;
}

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
          <Pressable accessibilityRole="button" accessibilityLabel="Edit your question" onPress={onEdit} hitSlop={8} style={styles.action}>
            <Ionicons name="create-outline" size={13} color={colors.inkSoft} />
            <Text style={styles.actionText}>Edit</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.assistantWrap}>
      <Text style={styles.avaLabel}>Ava</Text>
      <Pressable
        onLongPress={message.pending ? undefined : copy}
        delayLongPress={350}
        accessibilityHint={message.pending ? undefined : "Long-press to copy"}
        style={[styles.bubble, styles.assistant, message.failed && styles.failed]}
      >
        {message.pending && !message.content ? (
          <View style={styles.thinking} accessibilityLiveRegion="polite">
            <ActivityIndicator size="small" color={colors.accent} />
            <ThinkingText phase={phase} />
          </View>
        ) : (
          <Text style={[styles.assistantText, message.failed && styles.failedText]}>{typing.text}</Text>
        )}
      </Pressable>
      {copied ? <Text style={[styles.copied, styles.copiedLeft]}>Copied</Text> : null}
      {message.failed && onRetry ? (
        <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retry} hitSlop={6}>
          <Ionicons name="refresh" size={15} color={colors.accent} />
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      ) : null}
      {typing.done && message.panel ? <ResultsPanel panel={message.panel} /> : null}
      {typing.done && message.followUps?.length ? (
        <View style={styles.chips}>
          {message.followUps.slice(0, 4).map((s) => (
            <Pressable key={s} accessibilityRole="button" onPress={() => onFollowUp(s)} style={styles.chip} hitSlop={4}>
              <Text style={styles.chipText}>{s}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: { borderRadius: radius.md, paddingHorizontal: space.lg, paddingVertical: space.md, maxWidth: "88%" },
  user: { alignSelf: "flex-end", backgroundColor: colors.ink, borderBottomRightRadius: 4 },
  userWrap: { alignItems: "flex-end", gap: 4 },
  action: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 4 },
  actionText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.inkSoft },
  copied: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.success, paddingHorizontal: 4 },
  copiedLeft: { marginLeft: space.xs },
  retry: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.accent,
    paddingHorizontal: space.md,
    paddingVertical: 7,
  },
  retryText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.accent },
  userText: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.onBtn },
  assistantWrap: { gap: space.sm, alignSelf: "stretch" },
  avaLabel: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.inkSoft, marginLeft: space.xs },
  assistant: {
    alignSelf: "flex-start",
    backgroundColor: colors.card,
    borderBottomLeftRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  assistantText: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.ink },
  failed: { backgroundColor: colors.dangerSoft, borderColor: colors.dangerSoft },
  failedText: { color: colors.danger },
  thinking: { flexDirection: "row", alignItems: "center", gap: space.sm },
  thinkingText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.inkSoft },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    minHeight: 36,
    justifyContent: "center",
  },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.accent },
});
