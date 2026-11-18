import { Pressable, Text, StyleSheet } from "react-native";
import { colors, fonts } from "@/core/theme/tokens";

/** A tappable link. With `lead`, renders "lead label" with only the label in brand blue. */
export function TextLink({ label, onPress, lead }: { label: string; onPress: () => void; lead?: string }) {
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={lead ? `${lead} ${label}` : label} onPress={onPress} hitSlop={10}>
      <Text style={styles.link}>
        {lead ? <Text style={styles.lead}>{lead} </Text> : null}
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.accent, paddingVertical: 6 },
  lead: { fontFamily: fonts.body, color: colors.inkSoft },
});
