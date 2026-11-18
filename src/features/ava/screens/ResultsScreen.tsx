import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { EmptyState } from "@/core/components";
import { colors, fonts, radius, space } from "@/core/theme/tokens";
import { formatMinor } from "@/features/checkout/lib/checkoutDisplay";
import { OfferCardView } from "../components/OfferCardView";
import {
  NO_FILTERS,
  SORTS,
  TIMES,
  activeFilterCount,
  applyFilters,
  facets,
  sortOffers,
  type Filters,
  type SortKey,
  type StopsKey,
  type TimeKey,
} from "../lib/resultsFilter";
import { useResultsStore } from "../resultsStore";

const STOP_LABEL: Record<StopsKey, string> = { 0: "Nonstop", 1: "1 stop", 2: "2+ stops" };

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

/**
 * All options from one Ava reply, like the web's results view: sort tabs,
 * quick filter chips, a full filter sheet, and the offer cards (tap to expand,
 * Book from there).
 */
export function ResultsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const panel = useResultsStore((s) => (id ? s.panels[id] : undefined));
  const offers = useMemo(() => panel?.offers ?? [], [panel]);
  const [sort, setSort] = useState<SortKey>("angle");
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const f = useMemo(() => facets(offers), [offers]);
  const shown = useMemo(() => sortOffers(applyFilters(offers, filters), sort), [offers, filters, sort]);
  const active = activeFilterCount(filters);
  const currency = offers[0]?.currency ?? "PKR";

  if (!panel) {
    return (
      <View style={styles.root}>
        <Stack.Screen options={{ title: "Results" }} />
        <EmptyState title="Results expired" body="Ask Ava again to see fresh options." actionLabel="Back to Ava" onAction={() => router.back()} />
      </View>
    );
  }

  const set = (patch: Partial<Filters>) => {
    void Haptics.selectionAsync().catch(() => {});
    setFilters((cur) => ({ ...cur, ...patch }));
  };

  // Price steps for the "Max price" choice: quarters between cheapest and dearest.
  const priceSteps =
    f.priceMax > f.priceMin
      ? [0.25, 0.5, 0.75].map((q) => Math.round(f.priceMin + (f.priceMax - f.priceMin) * q))
      : [];

  const quick: { key: string; label: string; on: boolean; run: () => void }[] = f.isHotel
    ? [
        ...(f.anyBreakfast ? [{ key: "bf", label: "Breakfast", on: filters.breakfast, run: () => set({ breakfast: !filters.breakfast }) }] : []),
        ...(f.anyRefundable ? [{ key: "rf", label: "Free cancellation", on: filters.refundable, run: () => set({ refundable: !filters.refundable }) }] : []),
        ...[4, 5]
          .filter((s) => f.stars.some((x) => x >= s))
          .map((s) => ({ key: `s${s}`, label: `${s}★+`, on: filters.minStars === s, run: () => set({ minStars: filters.minStars === s ? 0 : s }) })),
      ]
    : [
        ...f.stops.map((s) => ({ key: `st${s}`, label: STOP_LABEL[s], on: filters.stops.includes(s), run: () => set({ stops: toggle(filters.stops, s) }) })),
        ...(f.anyBaggage ? [{ key: "bag", label: "Checked bag", on: filters.baggage, run: () => set({ baggage: !filters.baggage }) }] : []),
        ...(f.anyRefundable ? [{ key: "rf", label: "Refundable", on: filters.refundable, run: () => set({ refundable: !filters.refundable }) }] : []),
      ];

  const header = (
    <View style={styles.header}>
      <View style={styles.segment} accessibilityRole="tablist">
        {SORTS.filter((s) => !(f.isHotel && s.key === "duration")).map((s) => {
          const on = s.key === sort;
          return (
            <Pressable
              key={s.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => {
                void Haptics.selectionAsync().catch(() => {});
                setSort(s.key);
              }}
              style={[styles.segBtn, on && styles.segOn]}
            >
              <Text style={[styles.segText, on && styles.segTextOn]}>{s.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroller} contentContainerStyle={styles.chips}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`All filters${active ? `, ${active} on` : ""}`}
          onPress={() => setSheetOpen(true)}
          style={[styles.chip, active > 0 && styles.chipOn]}
        >
          <Ionicons name="options-outline" size={15} color={active ? colors.onBtn : colors.ink} />
          <Text style={[styles.chipText, active > 0 && styles.chipTextOn]}>{active ? `Filters · ${active}` : "Filters"}</Text>
        </Pressable>
        {quick.map((q) => (
          <Pressable
            key={q.key}
            accessibilityRole="button"
            accessibilityState={{ selected: q.on }}
            onPress={q.run}
            style={[styles.chip, q.on && styles.chipOn]}
          >
            <Text style={[styles.chipText, q.on && styles.chipTextOn]}>{q.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.countRow}>
        <Text style={styles.count}>
          {shown.length === offers.length ? `${offers.length} options` : `${shown.length} of ${offers.length} options`}
        </Text>
        {active ? (
          <Pressable accessibilityRole="button" onPress={() => set(NO_FILTERS)} hitSlop={8}>
            <Text style={styles.clear}>Clear filters</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: panel.tripTitle || panel.queryLabel || panel.legRoute || "Results" }} />
      <FlatList
        data={shown}
        keyExtractor={(o) => o.id}
        ListHeaderComponent={header}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + space.xl }]}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        renderItem={({ item }) => <OfferCardView offer={item} />}
        ListEmptyComponent={
          <EmptyState title="No options match" body="Try removing a filter." actionLabel="Clear filters" onAction={() => set(NO_FILTERS)} />
        }
      />

      <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={() => setSheetOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setSheetOpen(false)} accessibilityLabel="Close filters" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
          <View style={styles.grabber} />
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>Filters</Text>
            {active ? (
              <Pressable accessibilityRole="button" onPress={() => set(NO_FILTERS)} hitSlop={8}>
                <Text style={styles.clear}>Clear all</Text>
              </Pressable>
            ) : null}
          </View>
          <ScrollView style={styles.sheetBody} contentContainerStyle={styles.sheetContent}>
            {!f.isHotel && f.stops.length > 1 ? (
              <Group title="Stops">
                {f.stops.map((s) => (
                  <Choice key={s} label={STOP_LABEL[s]} on={filters.stops.includes(s)} onPress={() => set({ stops: toggle(filters.stops, s) })} />
                ))}
              </Group>
            ) : null}
            {!f.isHotel && f.times.length > 1 ? (
              <Group title="Departure time">
                {TIMES.filter((t) => f.times.includes(t.key)).map((t) => (
                  <Choice
                    key={t.key}
                    label={`${t.label} · ${t.hint}`}
                    on={filters.times.includes(t.key as TimeKey)}
                    onPress={() => set({ times: toggle(filters.times, t.key as TimeKey) })}
                  />
                ))}
              </Group>
            ) : null}
            {priceSteps.length ? (
              <Group title="Max price">
                {priceSteps.map((p) => (
                  <Choice
                    key={p}
                    label={`Up to ${formatMinor(p, currency)}`}
                    on={filters.maxPriceMinor === p}
                    onPress={() => set({ maxPriceMinor: filters.maxPriceMinor === p ? null : p })}
                  />
                ))}
              </Group>
            ) : null}
            {!f.isHotel && f.airlines.length > 1 ? (
              <Group title="Airlines">
                {f.airlines.map((a) => (
                  <Choice
                    key={a.name}
                    label={`${a.name} · ${a.count}`}
                    on={filters.airlines.includes(a.name)}
                    onPress={() => set({ airlines: toggle(filters.airlines, a.name) })}
                  />
                ))}
              </Group>
            ) : null}
            {f.isHotel && f.stars.length > 1 ? (
              <Group title="Stars">
                {[3, 4, 5]
                  .filter((s) => f.stars.some((x) => x >= s))
                  .map((s) => (
                    <Choice key={s} label={`${s}★ and up`} on={filters.minStars === s} onPress={() => set({ minStars: filters.minStars === s ? 0 : s })} />
                  ))}
              </Group>
            ) : null}
            <View style={styles.switches}>
              {!f.isHotel && f.anyBaggage ? (
                <Toggle label="Checked bag included" value={filters.baggage} onChange={(v) => set({ baggage: v })} />
              ) : null}
              {f.anyRefundable ? (
                <Toggle label={f.isHotel ? "Free cancellation" : "Refundable"} value={filters.refundable} onChange={(v) => set({ refundable: v })} />
              ) : null}
              {f.isHotel && f.anyBreakfast ? (
                <Toggle label="Breakfast included" value={filters.breakfast} onChange={(v) => set({ breakfast: v })} />
              ) : null}
            </View>
          </ScrollView>
          <Pressable accessibilityRole="button" onPress={() => setSheetOpen(false)} style={({ pressed }) => [styles.apply, pressed && styles.pressed]}>
            <Text style={styles.applyText}>Show {shown.length} option{shown.length === 1 ? "" : "s"}</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.groupItems}>{children}</View>
    </View>
  );
}

function Choice({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={onPress} style={[styles.choice, on && styles.choiceOn]}>
      {on ? <Ionicons name="checkmark" size={14} color={colors.onBtn} /> : null}
      <Text style={[styles.choiceText, on && styles.choiceTextOn]}>{label}</Text>
    </Pressable>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.toggle}>
      <Text style={styles.toggleText}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.accent, false: colors.line }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  list: { padding: space.lg },
  sep: { height: space.md },
  header: { gap: space.md, marginBottom: space.md },
  pressed: { opacity: 0.85 },

  segment: { flexDirection: "row", backgroundColor: "#e6ebf1", borderRadius: radius.pill, padding: 4 },
  segBtn: { flex: 1, minHeight: 38, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  segOn: { backgroundColor: colors.card, shadowColor: "#0b1219", shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  segText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.inkSoft },
  segTextOn: { color: colors.ink },

  chipScroller: { flexGrow: 0, marginHorizontal: -space.lg },
  chips: { gap: space.sm, paddingHorizontal: space.lg, alignItems: "center" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minHeight: 36,
    paddingHorizontal: 13,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.ink },
  chipTextOn: { color: colors.onBtn },

  countRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  count: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.inkSoft },
  clear: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.accent },

  backdrop: { flex: 1, backgroundColor: "rgba(11,18,25,0.35)" },
  sheet: { maxHeight: "82%", backgroundColor: colors.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: space.lg, paddingTop: space.sm },
  grabber: { alignSelf: "center", width: 38, height: 5, borderRadius: 3, backgroundColor: colors.line, marginBottom: space.md },
  sheetHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: space.sm },
  sheetTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  sheetBody: { flexGrow: 0 },
  sheetContent: { gap: space.lg, paddingBottom: space.md },
  group: { gap: space.sm },
  groupTitle: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase", color: colors.inkSoft },
  groupItems: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  choice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minHeight: 38,
    paddingHorizontal: 13,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bg,
  },
  choiceOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  choiceText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.ink },
  choiceTextOn: { color: colors.onBtn },
  switches: { gap: 2 },
  toggle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 48 },
  toggleText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.ink },
  apply: { minHeight: 50, borderRadius: radius.pill, backgroundColor: colors.btn, alignItems: "center", justifyContent: "center", marginTop: space.sm },
  applyText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.onBtn },
});
