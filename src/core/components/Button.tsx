import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from "react-native";
import { colors, fonts, radius, space } from "@/core/theme/tokens";

type Variant = "primary" | "ghost" | "accent";

/** Dark pill button (`.fo-ui-btn`), plus ghost and accent variants. */
export function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && !inactive && styles.pressed,
        inactive && styles.inactive,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "ghost" ? colors.ink : colors.onBtn} />
      ) : (
        <Text style={[styles.label, variant === "ghost" && styles.ghostLabel]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: radius.pill,
    paddingHorizontal: space.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: { backgroundColor: colors.btn },
  accent: { backgroundColor: colors.accent },
  ghost: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.line },
  pressed: { opacity: 0.85 },
  inactive: { opacity: 0.5 },
  label: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.onBtn },
  ghostLabel: { color: colors.ink },
});
