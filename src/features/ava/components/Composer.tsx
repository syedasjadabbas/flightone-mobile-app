import { useEffect, useRef, useState, type ComponentRef } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, fonts, radius, space } from "@/core/theme/tokens";

export type Prefill = { text: string; key: number };

/**
 * Message box with Send, or Stop while Ava is answering.
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
    onSend(text);
    setText("");
  };

  return (
    <View style={styles.bar}>
      <TextInput
        ref={inputRef}
        value={text}
        onChangeText={setText}
        placeholder="Where do you want to go?"
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
        <Pressable accessibilityRole="button" accessibilityLabel="Stop Ava" onPress={onStop} style={[styles.btn, styles.stop]}>
          <Text style={styles.btnText}>Stop</Text>
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send message"
          accessibilityState={{ disabled: !canSend }}
          disabled={!canSend}
          onPress={submit}
          style={[styles.btn, !canSend && styles.off]}
        >
          <Text style={styles.btnText}>Send</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: space.sm,
    padding: space.md,
    backgroundColor: colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    paddingHorizontal: space.md,
    paddingTop: 12,
    paddingBottom: 12,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
  },
  btn: {
    minHeight: 44,
    minWidth: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.btn,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.lg,
  },
  stop: { backgroundColor: colors.danger },
  off: { opacity: 0.4 },
  btnText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.onBtn },
});
