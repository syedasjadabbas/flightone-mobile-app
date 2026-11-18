import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, space } from "@/core/theme/tokens";
import { useCompaniesQuery } from "../api/corporateApi";
import { useCorporateProfileStore } from "../store/corporateProfile.store";

/** "Booking for <company>" strip with a switch back to personal (web's CorporateModeBadge). */
export function CorporateModeBanner() {
  const { mode, companyId, setPersonal } = useCorporateProfileStore();
  const { data: companies = [] } = useCompaniesQuery(undefined, { skip: mode !== "CORPORATE" });
  if (mode !== "CORPORATE" || !companyId) return null;
  const name = companies.find((c) => c.id === companyId)?.name ?? "your company";
  return (
    <View style={styles.bar} accessibilityRole="summary">
      <Text style={styles.text} numberOfLines={1}>
        Booking for {name}
      </Text>
      <Pressable accessibilityRole="button" onPress={setPersonal} hitSlop={8}>
        <Text style={styles.link}>Switch to personal</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.sm,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  text: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 13, color: colors.accent },
  link: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.ink, textDecorationLine: "underline" },
});
