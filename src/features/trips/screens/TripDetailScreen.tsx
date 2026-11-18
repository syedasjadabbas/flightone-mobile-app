import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { EmptyState, Screen } from "@/core/components";
import { colors, space } from "@/core/theme/tokens";
import { useJourneyWatchesQuery } from "../api/journeyApi";
import { NextTripCard } from "../components/NextTripCard";
import { TripCard } from "../components/TripCard";
import { journeyHeadline } from "../lib/journeySteps";
import { localToday } from "../lib/tripList";

/** One trip on its own page: summary card on top, then the full timeline, live status and refunds. */
export function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading } = useJourneyWatchesQuery();
  const watch = data?.items.find((w) => w.id === id);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
  if (!watch) {
    return (
      <Screen edges={["left", "right", "bottom"]}>
        <Stack.Screen options={{ title: "Trip" }} />
        <EmptyState title="Trip not found" body="It may have been removed." actionLabel="Back to trips" onAction={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen edges={["left", "right", "bottom"]} contentStyle={styles.content}>
      <Stack.Screen options={{ title: journeyHeadline(watch).route }} />
      <NextTripCard watch={watch} today={localToday()} asHeader />
      <TripCard watch={watch} detailed />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  content: { gap: space.lg },
});
