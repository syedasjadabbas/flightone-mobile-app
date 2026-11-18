import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, SectionList, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { EmptyState, Notice } from "@/core/components";
import { formatApiError } from "@/core/api/formatApiError";
import { colors, fonts, radius, space, type } from "@/core/theme/tokens";
import { useJourneyWatchesQuery } from "../api/journeyApi";
import { NextTripCard } from "../components/NextTripCard";
import { TripRow } from "../components/TripRow";
import { journeyHeadline } from "../lib/journeySteps";
import { groupByMonth, localToday, matchesQuery, sortTrips, tripView, type TripView } from "../lib/tripList";

const VIEWS: { key: TripView; label: string }[] = [
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
  { key: "cancelled", label: "Cancelled" },
];
const SEARCH_FROM = 4; // show search once there's something to search

/**
 * Trips: Upcoming / Past / Cancelled switch, the next trip as a big card, then a
 * compact month-grouped list. Each row opens the trip's own page (timeline,
 * live status, refunds), so the list stays short however many trips there are.
 */
export function TripsScreen() {
  const { data, isLoading, isFetching, error, refetch } = useJourneyWatchesQuery();
  const [view, setView] = useState<TripView>("upcoming");
  const [query, setQuery] = useState("");
  const today = localToday();

  const items = useMemo(() => data?.items ?? [], [data]);
  const counts = useMemo(() => {
    const c: Record<TripView, number> = { upcoming: 0, past: 0, cancelled: 0 };
    for (const w of items) c[tripView(w)] += 1;
    return c;
  }, [items]);

  const { hero, sections, matches } = useMemo(() => {
    const inView = sortTrips(
      items.filter((w) => tripView(w) === view),
      view,
    );
    const searched = query.trim() ? inView.filter((w) => matchesQuery(w, journeyHeadline(w), query)) : inView;
    const first = view === "upcoming" && !query.trim() ? searched[0] : undefined;
    const rest = first ? searched.slice(1) : searched;
    return { hero: first, sections: groupByMonth(rest), matches: searched.length };
  }, [items, view, query]);

  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <Text style={type.h1}>Trips</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Plan a new trip with Ava"
          onPress={() => router.navigate("/ava")}
          style={({ pressed }) => [styles.newBtn, pressed && styles.pressed]}
        >
          <Ionicons name="add" size={18} color={colors.onBtn} />
          <Text style={styles.newText}>New trip</Text>
        </Pressable>
      </View>

      {items.length ? (
        <View style={styles.segment} accessibilityRole="tablist">
          {VIEWS.map((v) => {
            const on = v.key === view;
            return (
              <Pressable
                key={v.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${v.label}, ${counts[v.key]} trips`}
                onPress={() => setView(v.key)}
                style={[styles.segBtn, on && styles.segOn]}
              >
                <Text style={[styles.segText, on && styles.segTextOn]}>{v.label}</Text>
                <View style={[styles.count, on && styles.countOn]}>
                  <Text style={[styles.countText, on && styles.countTextOn]}>{counts[v.key]}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {items.length >= SEARCH_FROM ? (
        <View style={styles.search}>
          <Ionicons name="search" size={17} color={colors.inkFaint} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search city, airline or booking ref"
            placeholderTextColor={colors.inkFaint}
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            accessibilityLabel="Search trips"
          />
          {query ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery("")} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={colors.inkFaint} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {error ? <Notice message={formatApiError(error, "We couldn't load your trips.")} /> : null}
      {hero ? <NextTripCard watch={hero} today={today} /> : null}
    </View>
  );

  const empty = error ? null : !items.length ? (
    <EmptyState
      title="No trips yet"
      body="Book a flight or stay with Ava and it will show up here with live status."
      actionLabel="Plan a trip with Ava"
      onAction={() => router.navigate("/ava")}
    />
  ) : query.trim() && !matches ? (
    <EmptyState title="No matches" body={`Nothing in ${view} trips matches "${query.trim()}".`} />
  ) : !matches ? (
    <EmptyState
      title={view === "upcoming" ? "Nothing coming up" : view === "past" ? "No past trips yet" : "No cancelled trips"}
      body={view === "upcoming" ? "Ask Ava to plan your next one." : "They'll appear here after you travel."}
      actionLabel={view === "upcoming" ? "Plan a trip with Ava" : undefined}
      onAction={view === "upcoming" ? () => router.navigate("/ava") : undefined}
    />
  ) : null;

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <SectionList
          contentInsetAdjustmentBehavior="automatic"
          sections={sections}
          keyExtractor={(w) => w.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={header}
          ListEmptyComponent={hero ? undefined : (empty ?? undefined)}
          stickySectionHeadersEnabled={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionCount}>{section.data.length}</Text>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          renderItem={({ item }) => <TripRow watch={item} today={today} />}
          refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => void refetch()} tintColor={colors.accent} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: space.lg, paddingBottom: space.xxl },
  header: { gap: space.md, marginBottom: space.xs },
  pressed: { opacity: 0.85 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  newBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.btn, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8 },
  newText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.onBtn },

  segment: {
    flexDirection: "row",
    backgroundColor: "#e6ebf1",
    borderRadius: radius.pill,
    padding: 4,
  },
  segBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 38, borderRadius: radius.pill },
  segOn: { backgroundColor: colors.card, shadowColor: "#0b1219", shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  segText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.inkSoft },
  segTextOn: { color: colors.ink },
  count: { minWidth: 20, paddingHorizontal: 5, height: 18, borderRadius: 9, backgroundColor: "rgba(11,18,25,0.08)", alignItems: "center", justifyContent: "center" },
  countOn: { backgroundColor: colors.accent },
  countText: { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.inkSoft },
  countTextOn: { color: "#fff" },

  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.ink, paddingVertical: 10 },

  sectionHead: { flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: space.lg, marginBottom: space.sm, marginLeft: 2 },
  sectionTitle: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase", color: colors.inkSoft },
  sectionCount: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.inkFaint },
  sep: { height: space.sm },
});
