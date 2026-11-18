import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { DateField } from "@/core/components";
import { colors, fonts, radius, space } from "@/core/theme/tokens";
import type { TravelPlan } from "../types";
import { CABINS, cabinLabel, chipDate, planSummary, shiftDay, spokenDate, type PlanSummary } from "../lib/tripPlan";

type IconName = keyof typeof Ionicons.glyphMap;
type Option = { label: string; icon?: IconName; selected?: boolean; run: () => void };
type Sheet = { title: string; options: Option[]; date?: { label: string; value: string; onPick: (iso: string) => void } };

const isoToday = () => new Date().toISOString().slice(0, 10);

/**
 * The trip Ava is working on, as tappable chips above the message box:
 * route · dates · travellers · cabin. Each chip opens a small sheet; the choice
 * is sent to Ava as a plain sentence ("Make it business class"), so she
 * searches again with everything else kept.
 */
export function TripBar({
  plan,
  disabled,
  onSend,
  onPrefill,
}: {
  plan: TravelPlan | null;
  disabled: boolean;
  onSend: (text: string) => void;
  /** Put a half-written sentence in the message box (e.g. "Fly to "). */
  onPrefill: (text: string) => void;
}) {
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [pickedDate, setPickedDate] = useState("");
  const insets = useSafeAreaInsets();
  const s = planSummary(plan);
  if (!s) return null;
  const dateCfg = sheet?.date;
  const canApply = Boolean(dateCfg) && /^\d{4}-\d{2}-\d{2}$/.test(pickedDate) && pickedDate !== dateCfg?.value;

  const open = (next: Sheet) => {
    void Haptics.selectionAsync().catch(() => {});
    setPickedDate(next.date?.value ?? "");
    setSheet(next);
  };
  const choose = (run: () => void) => {
    setSheet(null);
    run();
  };

  const chips = s.kind === "flight" ? flightChips(s, onSend, onPrefill) : hotelChips(s, onSend, onPrefill);

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroller}
        contentContainerStyle={styles.bar}
        keyboardShouldPersistTaps="handled"
        accessibilityLabel="Your trip. Tap a part to change it."
      >
        {chips.map((c) => (
          <Pressable
            key={c.label}
            accessibilityRole="button"
            accessibilityLabel={`${c.label}. Change`}
            disabled={disabled}
            onPress={() => open(c.sheet)}
            style={({ pressed }) => [styles.chip, pressed && styles.pressed, disabled && styles.off]}
          >
            <Ionicons name={c.icon} size={14} color={colors.accent} />
            <Text style={styles.chipText}>{c.label}</Text>
            <Ionicons name="chevron-down" size={12} color={colors.inkFaint} />
          </Pressable>
        ))}
      </ScrollView>

      <Modal visible={sheet != null} transparent animationType="slide" onRequestClose={() => setSheet(null)}>
        <Pressable style={styles.backdrop} onPress={() => setSheet(null)} accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
          <View style={styles.grabber} />
          <Text style={styles.sheetTitle}>{sheet?.title}</Text>
          {sheet?.options.map((o) => (
            <Pressable
              key={o.label}
              accessibilityRole="button"
              accessibilityState={{ selected: Boolean(o.selected) }}
              onPress={() => choose(o.run)}
              style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
            >
              {o.icon ? <Ionicons name={o.icon} size={18} color={colors.ink} /> : null}
              <Text style={styles.optionText}>{o.label}</Text>
              {o.selected ? <Ionicons name="checkmark" size={18} color={colors.accent} /> : null}
            </Pressable>
          ))}
          {dateCfg ? (
            <View style={styles.datePick}>
              <DateField label={dateCfg.label} value={pickedDate} onChange={setPickedDate} minimumDate={new Date()} />
              <Pressable
                accessibilityRole="button"
                disabled={!canApply}
                onPress={() => choose(() => dateCfg.onPick(pickedDate))}
                style={({ pressed }) => [styles.apply, pressed && styles.pressed, !canApply && styles.off]}
              >
                <Text style={styles.applyText}>Search this date</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </Modal>
    </>
  );
}

type Chip = { label: string; icon: IconName; sheet: Sheet };

function dateSheet(title: string, label: string, iso: string | null, say: (iso: string) => string, onSend: (t: string) => void): Sheet {
  const today = isoToday();
  const options: Option[] = [];
  if (iso) {
    const earlier = shiftDay(iso, -1);
    if (earlier >= today) options.push({ label: "A day earlier", icon: "remove-circle-outline", run: () => onSend(say(earlier)) });
    options.push({ label: "A day later", icon: "add-circle-outline", run: () => onSend(say(shiftDay(iso, 1))) });
  }
  return { title, options, date: { label, value: iso ?? "", onPick: (d) => onSend(say(d)) } };
}

function flightChips(s: Extract<PlanSummary, { kind: "flight" }>, onSend: (t: string) => void, onPrefill: (t: string) => void): Chip[] {
  const chips: Chip[] = [
    {
      label: `${s.origin} → ${s.destination}`,
      icon: "airplane-outline",
      sheet: {
        title: "Route",
        options: [
          { label: `Swap: ${s.destination} → ${s.origin}`, icon: "swap-horizontal", run: () => onSend(`Swap it: fly from ${s.destination} to ${s.origin} instead`) },
          { label: "Change destination…", icon: "location-outline", run: () => onPrefill("Fly to ") },
          { label: "Change departure city…", icon: "navigate-outline", run: () => onPrefill("Fly from ") },
        ],
      },
    },
    {
      label: chipDate(s.departureDate) ?? "Pick dates",
      icon: "calendar-outline",
      sheet: dateSheet("Departure date", "Departure", s.departureDate, (d) => `Change the departure date to ${spokenDate(d)}`, onSend),
    },
  ];
  if (s.returnDate) {
    const back = dateSheet("Return date", "Return", s.returnDate, (d) => `Change the return date to ${spokenDate(d)}`, onSend);
    back.options.push({ label: "Make it one way", icon: "arrow-forward", run: () => onSend("Make it one way") });
    chips.push({ label: `Back ${chipDate(s.returnDate)}`, icon: "return-down-back-outline", sheet: back });
  } else {
    chips.push({
      label: "One way",
      icon: "arrow-forward",
      sheet: {
        ...dateSheet("Add a return", "Return", null, (d) => `Add a return flight on ${spokenDate(d)}`, onSend),
      },
    });
  }
  chips.push({
    label: `${s.passengers} ${s.passengers === 1 ? "adult" : "adults"}`,
    icon: "people-outline",
    sheet: {
      title: "Travellers",
      options: [1, 2, 3, 4, 5, 6].map((n) => ({
        label: `${n} ${n === 1 ? "adult" : "adults"}`,
        selected: n === s.passengers,
        run: () => (n === s.passengers ? undefined : onSend(`Make it ${n} ${n === 1 ? "adult" : "adults"}`)),
      })),
    },
  });
  chips.push({
    label: cabinLabel(s.cabin),
    icon: "ribbon-outline",
    sheet: {
      title: "Cabin",
      options: CABINS.map((c) => ({
        label: c.label,
        selected: c.key === s.cabin,
        run: () => (c.key === s.cabin ? undefined : onSend(`Make it ${c.label.toLowerCase()} class`)),
      })),
    },
  });
  return chips;
}

function hotelChips(s: Extract<PlanSummary, { kind: "hotel" }>, onSend: (t: string) => void, onPrefill: (t: string) => void): Chip[] {
  return [
    {
      label: s.city,
      icon: "bed-outline",
      sheet: { title: "City", options: [{ label: "Change city…", icon: "location-outline", run: () => onPrefill("Hotels in ") }] },
    },
    {
      label: [chipDate(s.checkIn), chipDate(s.checkOut)].filter(Boolean).join(" – ") || "Pick dates",
      icon: "calendar-outline",
      sheet: dateSheet("Check-in date", "Check-in", s.checkIn, (d) => `Change the check-in date to ${spokenDate(d)}`, onSend),
    },
    {
      label: `${s.guests} ${s.guests === 1 ? "guest" : "guests"}`,
      icon: "people-outline",
      sheet: {
        title: "Guests",
        options: [1, 2, 3, 4, 5, 6].map((n) => ({
          label: `${n} ${n === 1 ? "guest" : "guests"}`,
          selected: n === s.guests,
          run: () => (n === s.guests ? undefined : onSend(`Make it ${n} ${n === 1 ? "guest" : "guests"}`)),
        })),
      },
    },
  ];
}

const styles = StyleSheet.create({
  // A horizontal ScrollView in a column grows to fill it unless told not to.
  scroller: { flexGrow: 0, flexShrink: 0 },
  bar: { alignItems: "center", gap: space.sm, paddingHorizontal: space.md, paddingTop: space.sm, paddingBottom: 2 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 11,
    minHeight: 34,
  },
  chipText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.ink },
  pressed: { opacity: 0.8 },
  off: { opacity: 0.45 },
  backdrop: { flex: 1, backgroundColor: "rgba(11,18,25,0.35)" },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    gap: 2,
  },
  grabber: { alignSelf: "center", width: 38, height: 5, borderRadius: 3, backgroundColor: colors.line, marginBottom: space.md },
  sheetTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.ink, marginBottom: space.sm },
  option: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 50, paddingHorizontal: space.xs, borderRadius: radius.sm },
  optionPressed: { backgroundColor: colors.bg },
  optionText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.ink },
  datePick: { gap: space.md, marginTop: space.sm },
  apply: { minHeight: 48, borderRadius: radius.pill, backgroundColor: colors.btn, alignItems: "center", justifyContent: "center" },
  applyText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.onBtn },
});
