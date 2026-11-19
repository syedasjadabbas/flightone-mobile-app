import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { colors, fonts, radius, space, type } from "@/core/theme/tokens";

/** Labelled row of chips for a single choice (title, gender, payment method…). Selected chip shows a tick. */
export function ChoiceRow<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T | undefined;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.wrap} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <Text style={type.label}>{label}</Text>
      <View style={styles.row}>
        {options.map((o) => {
          const on = value === o.value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: on, disabled: Boolean(disabled) }}
              accessibilityLabel={o.label}
              disabled={disabled}
              onPress={() => {
                void Haptics.selectionAsync().catch(() => {});
                onChange(o.value);
              }}
              hitSlop={4}
              style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && styles.pressed, disabled && styles.off]}
            >
              {on ? <Ionicons name="checkmark" size={14} color={colors.accent} /> : null}
              <Text style={[styles.text, on && styles.textOn]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  row: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  chipOn: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  pressed: { opacity: 0.8 },
  off: { opacity: 0.5 },
  text: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.ink },
  textOn: { fontFamily: fonts.bodySemi, color: colors.accent },
});
