import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, fonts, radius, space, type } from "@/core/theme/tokens";

type Props = TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
  /** Leading icon inside the field (e.g. "mail-outline"). */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Keep the label for screen readers but don't show it (e.g. a search box). */
  hideLabel?: boolean;
};

/**
 * Labelled input with error text, accessible label and focus ring.
 * Password fields (`secureTextEntry`) get a show/hide eye button.
 */
export function TextField({ label, error, hint, icon, hideLabel, style, onFocus, onBlur, secureTextEntry, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  const [reveal, setReveal] = useState(false);
  const boxed = Boolean(icon) || Boolean(secureTextEntry);

  const handlers = {
    onFocus: (e: Parameters<NonNullable<TextInputProps["onFocus"]>>[0]) => {
      setFocused(true);
      onFocus?.(e);
    },
    onBlur: (e: Parameters<NonNullable<TextInputProps["onBlur"]>>[0]) => {
      setFocused(false);
      onBlur?.(e);
    },
  };

  return (
    <View style={styles.wrap}>
      {hideLabel ? null : <Text style={type.label}>{label}</Text>}
      {boxed ? (
        <View style={[styles.box, focused && styles.focused, Boolean(error) && styles.invalid]}>
          {icon ? <Ionicons name={icon} size={18} color={focused ? colors.accent : colors.inkFaint} /> : null}
          <TextInput
            accessibilityLabel={label}
            placeholderTextColor={colors.inkFaint}
            secureTextEntry={secureTextEntry && !reveal}
            style={[styles.boxInput, style]}
            {...handlers}
            {...rest}
          />
          {secureTextEntry ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={reveal ? "Hide password" : "Show password"}
              onPress={() => setReveal((v) => !v)}
              hitSlop={10}
            >
              <Ionicons name={reveal ? "eye-off-outline" : "eye-outline"} size={20} color={colors.inkSoft} />
            </Pressable>
          ) : null}
        </View>
      ) : (
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.inkFaint}
          style={[styles.input, focused && styles.focused, Boolean(error) && styles.invalid, style]}
          {...handlers}
          {...rest}
        />
      )}
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
  box: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    paddingHorizontal: space.md,
  },
  boxInput: { flex: 1, alignSelf: "stretch", fontFamily: fonts.body, fontSize: 15, color: colors.ink, paddingVertical: space.md },
  focused: { borderColor: colors.accent, borderWidth: 2 },
  invalid: { borderColor: colors.danger },
  error: { fontFamily: fonts.body, fontSize: 13, color: colors.danger },
  hint: { fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft },
});
