import { StyleSheet, View } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { EmptyState, Screen, SkeletonCard, SkeletonList } from "@/core/components";
import { colors, space } from "@/core/theme/tokens";
import { useJourneyWatchesQuery } from "../api/journeyApi";
import { NextTripCard } from "../components/NextTripCard";
import { TripDetailBody } from "../components/TripDetailBody";
import { journeyHeadline } from "../lib/journeySteps";
import { localToday } from "../lib/tripList";

/** One trip on its own page: summary card on top, then the full timeline, live status and refunds. */
export function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading } = useJourneyWatchesQuery();
  const watch = data?.items.find((w) => w.id === id);

  if (isLoading) {
    return (
      <View style={styles.skeleton}>
        <SkeletonCard height={190} dark />
        <SkeletonCard height={96} />
        <SkeletonList count={3} />
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
      <TripDetailBody watch={watch} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  skeleton: { flex: 1, padding: space.lg, gap: space.lg, backgroundColor: colors.bg },
  content: { gap: space.lg },
});
