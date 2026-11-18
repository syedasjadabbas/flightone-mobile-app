import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
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

export function MessageBubble({
  message,
  phase,
  onFollowUp,
}: {
  message: ChatMessage;
  phase: AvaPhase | null;
  onFollowUp: (text: string) => void;
}) {
  if (message.role === "user") {
    return (
      <View style={[styles.bubble, styles.user]}>
        <Text style={styles.userText}>{message.content}</Text>
      </View>
    );
  }

  return (
    <View style={styles.assistantWrap}>
      <Text style={styles.avaLabel}>Ava</Text>
      <View style={[styles.bubble, styles.assistant, message.failed && styles.failed]}>
        {message.pending && !message.content ? (
          <View style={styles.thinking} accessibilityLiveRegion="polite">
            <ActivityIndicator size="small" color={colors.accent} />
            <ThinkingText phase={phase} />
          </View>
        ) : (
          <Text style={[styles.assistantText, message.failed && styles.failedText]}>{message.content}</Text>
        )}
      </View>
      {message.panel ? <ResultsPanel panel={message.panel} /> : null}
      {message.followUps?.length ? (
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
