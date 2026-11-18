import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { EmptyState, Screen } from "@/core/components";
import { colors, space, type } from "@/core/theme/tokens";
import { useProfileQuery } from "../api/profileApi";
import { DocumentsSection, HistorySection, SecuritySection } from "../components/AccountSections";
import { CompanionsSection, EmergencySection, LoyaltySection } from "../components/PeopleSections";
import { PreferencesSection } from "../components/PreferencesSection";
import { SECTIONS, isSectionKey } from "../lib/profileSections";

/** One Profile area on its own screen (`/profile/preferences`, `/profile/documents`, …). */
export function ProfileSectionScreen() {
  const { section } = useLocalSearchParams<{ section: string }>();
  const { data: profile, isLoading } = useProfileQuery();

  if (!isSectionKey(section)) {
    return (
      <Screen edges={["left", "right", "bottom"]}>
        <Stack.Screen options={{ title: "Profile" }} />
        <EmptyState title="Not found" body="That part of your profile doesn't exist." actionLabel="Back" onAction={() => router.back()} />
      </Screen>
    );
  }

  const meta = SECTIONS[section];
  return (
    <Screen edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: meta.title }} />
      <View style={styles.intro}>
        <Text style={type.bodySoft}>{meta.detail}</Text>
      </View>
      {section === "preferences" ? (
        profile ? <PreferencesSection profile={profile} /> : isLoading ? <ActivityIndicator color={colors.accent} /> : null
      ) : null}
      {section === "companions" ? <CompanionsSection /> : null}
      {section === "emergency" ? <EmergencySection /> : null}
      {section === "loyalty" ? <LoyaltySection /> : null}
      {section === "documents" ? <DocumentsSection /> : null}
      {section === "security" ? <SecuritySection /> : null}
      {section === "history" ? <HistorySection /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { marginBottom: -space.xs },
});
