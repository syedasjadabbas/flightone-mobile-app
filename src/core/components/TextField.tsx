import { useState } from "react";
import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { colors, fonts, radius, space, type } from "@/core/theme/tokens";

type Props = TextInputProps & { label: string; error?: string; hint?: string };

/** Labelled input with error text, accessible label and focus ring. */
export function TextField({ label, error, hint, style, onFocus, onBlur, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      <Text style={type.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.inkFaint}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[styles.input, focused && styles.focused, Boolean(error) && styles.invalid, style]}
        {...rest}
      />
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  input: {
    minHeight: 48,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    paddingHorizontal: space.md,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
  },
  focused: { borderColor: colors.accent, borderWidth: 2 },
  invalid: { borderColor: colors.danger },
  error: { fontFamily: fonts.body, fontSize: 13, color: colors.danger },
  hint: { fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft },
});
