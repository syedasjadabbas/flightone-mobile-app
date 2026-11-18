import { Pressable, Text, StyleSheet } from "react-native";
import { colors, fonts } from "@/core/theme/tokens";

export function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress} hitSlop={10}>
      <Text style={styles.link}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.accent, paddingVertical: 6 },
});
