import { useEffect, useRef, useState, type ComponentRef } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { colors, fonts, space } from "@/core/theme/tokens";

export type Prefill = { text: string; key: number };

const BTN = 44;
const LINE = 21;

/**
 * Message box: one rounded input pill that grows to about five lines, with a round
 * arrow-up Send button, which becomes a square Stop button while Ava is answering.
 * `prefill` (new `key` each time) puts text in the box and focuses it, e.g. "Edit" on your last question.
 */
export function Composer({
  busy,
  onSend,
  onStop,
  prefill,
}: {
  busy: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  prefill?: Prefill | null;
}) {
  const [text, setText] = useState("");
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  const [seenKey, setSeenKey] = useState<number | undefined>(undefined);
  if (prefill && prefill.key !== seenKey) {
    setSeenKey(prefill.key);
    setText(prefill.text);
  }
  useEffect(() => {
    if (prefill) inputRef.current?.focus();
  }, [prefill]);
  const canSend = text.trim().length > 0 && !busy;

  const submit = () => {
    if (!canSend) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onSend(text);
    setText("");
  };

  const stop = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onStop();
  };

  return (
    <View style={styles.bar}>
      <View style={styles.pill}>
        <TextInput
          ref={inputRef}
          value={text}
          onChangeText={setText}
          placeholder="Ask Ava anything about your trip…"
          placeholderTextColor={colors.inkFaint}
          accessibilityLabel="Message Ava"
          multiline
          maxLength={2000}
          style={styles.input}
          onSubmitEditing={submit}
          submitBehavior="submit"
          returnKeyType="send"
        />
        {busy ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Stop Ava"
            onPress={stop}
            hitSlop={6}
            style={({ pressed }) => [styles.stop, pressed && styles.pressed]}
          >
            <View style={styles.stopGlyph} />
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send message"
            accessibilityState={{ disabled: !canSend }}
            disabled={!canSend}
            onPress={submit}
            hitSlop={6}
            style={({ pressed }) => [styles.send, !canSend && styles.sendOff, pressed && styles.pressed]}
          >
            <Ionicons name="arrow-up" size={22} color={canSend ? colors.onBtn : colors.inkFaint} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: space.md,
    paddingTop: space.sm + 2,
    paddingBottom: space.sm + 2,
    backgroundColor: colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  pill: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: space.sm,
    minHeight: BTN + 8,
    borderRadius: 26,
    backgroundColor: colors.bg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    paddingLeft: space.lg,
    paddingRight: 4,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    minHeight: BTN,
    maxHeight: LINE * 5 + 22,
    paddingTop: 11,
    paddingBottom: 11,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: LINE,
    color: colors.ink,
  },
  send: {
    width: BTN,
    height: BTN,
    borderRadius: BTN / 2,
    backgroundColor: colors.btn,
    alignItems: "center",
    justifyContent: "center",
  },
  sendOff: { backgroundColor: "#e3e9ef" },
  stop: {
    width: BTN,
    height: BTN,
    borderRadius: 12,
    backgroundColor: colors.btn,
    alignItems: "center",
    justifyContent: "center",
  },
  stopGlyph: { width: 14, height: 14, borderRadius: 3, backgroundColor: "#ffffff" },
  pressed: { opacity: 0.8, transform: [{ scale: 0.96 }] },
});
