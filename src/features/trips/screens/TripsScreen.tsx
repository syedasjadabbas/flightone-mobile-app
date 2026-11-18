import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { AppText, Button, EmptyState, Notice, Pill } from "@/core/components";
import { formatApiError } from "@/core/api/formatApiError";
import { colors, space } from "@/core/theme/tokens";
import { useJourneyWatchesQuery } from "../api/journeyApi";
import type { JourneyWatch } from "../api/types";
import { TripCard } from "../components/TripCard";

type Filter = "all" | "active" | "upcoming" | "completed";
const FIRST_PAGE = 4;
const PAGE = 5;

/** Same buckets as the web's My Journey page. Cancelled trips show only under All. */
function bucket(w: JourneyWatch): Exclude<Filter, "all"> | "cancelled" {
  if (w.phase === "CANCELLED" || w.status === "CANCELLED") return "cancelled";
  if (w.phase === "COMPLETED" || w.status === "COMPLETED") return "completed";
  if (w.phase === "IN_PROGRESS") return "active";
  return "upcoming";
}

export function TripsScreen() {
  const { data, isLoading, isFetching, error, refetch } = useJourneyWatchesQuery();
  const [filter, setFilter] = useState<Filter>("all");
  const [shown, setShown] = useState(FIRST_PAGE);

  const items = data?.items ?? [];
  const counts = useMemo(() => {
    const c = { all: items.length, active: 0, upcoming: 0, completed: 0 };
    for (const w of items) {
      const b = bucket(w);
      if (b !== "cancelled") c[b] += 1;
    }
    return c;
  }, [items]);
  const filtered = filter === "all" ? items : items.filter((w) => bucket(w) === filter);
  const visible = filtered.slice(0, shown);

  const header = (
    <View style={styles.header}>
      <AppText variant="h1">Your trips</AppText>
      {items.length ? (
        <View style={styles.pills}>
          {(["all", "active", "upcoming", "completed"] as const).map((f) => (
            <Pill
              key={f}
              label={`${f[0].toUpperCase()}${f.slice(1)} ${counts[f]}`}
              selected={filter === f}
              onPress={() => {
                setFilter(f);
                setShown(FIRST_PAGE);
              }}
            />
          ))}
        </View>
      ) : null}
      {error ? <Notice message={formatApiError(error, "We couldn't load your trips.")} /> : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(w) => w.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={header}
          renderItem={({ item }) => <TripCard watch={item} />}
          refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => void refetch()} tintColor={colors.accent} />}
          ListEmptyComponent={
            error ? undefined : items.length ? (
              <EmptyState title="Nothing here" body="No trips match this filter." />
            ) : (
              <EmptyState
                title="No trips yet"
                body="Book a flight or stay with Ava and it will show up here with live status."
                actionLabel="Plan a trip with Ava"
                onAction={() => router.navigate("/ava")}
              />
            )
          }
          ListFooterComponent={
            filtered.length > shown ? (
              <Button variant="ghost" label={`Show more trips (${filtered.length - shown})`} onPress={() => setShown((n) => n + PAGE)} />
            ) : undefined
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: space.lg, gap: space.lg },
  header: { gap: space.md },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
});
