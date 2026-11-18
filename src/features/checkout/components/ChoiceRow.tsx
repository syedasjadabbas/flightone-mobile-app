import { StyleSheet, Text, View } from "react-native";
import { Pill } from "@/core/components";
import { space, type } from "@/core/theme/tokens";

/** Labelled row of pills for a single choice (title, gender, payment method). */
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
        {options.map((o) => (
          <Pill key={o.value} label={o.label} selected={value === o.value} onPress={disabled ? undefined : () => onChange(o.value)} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  row: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
});
