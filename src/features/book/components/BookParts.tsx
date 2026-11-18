import { useMemo, useState, type ReactNode } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { DateField } from "@/core/components";
import { colors, fonts, radius, space } from "@/core/theme/tokens";
import { allAirports, searchAirports, tileDate, type Airport } from "../lib/airports";

type IconName = keyof typeof Ionicons.glyphMap;

export const tap = () => void Haptics.selectionAsync().catch(() => {});

/** A big tappable field: small label, large value, optional sub line. */
export function Tile({
  icon,
  label,
  value,
  sub,
  onPress,
  style,
  placeholder,
}: {
  icon?: IconName;
  label: string;
  value?: string;
  sub?: string;
  onPress: () => void;
  style?: object;
  placeholder?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value || placeholder || "not set"}`}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [styles.tile, style, pressed && styles.pressed]}
    >
      <View style={styles.tileHead}>
        {icon ? <Ionicons name={icon} size={13} color={colors.inkFaint} /> : null}
        <Text style={styles.tileLabel}>{label}</Text>
      </View>
      <Text style={[styles.tileValue, !value && styles.tilePlaceholder]} numberOfLines={1}>
        {value || placeholder}
      </Text>
      {sub ? (
        <Text style={styles.tileSub} numberOfLines={1}>
          {sub}
        </Text>
      ) : null}
    </Pressable>
  );
}

/** A date tile that opens the native calendar. */
export function DateTile({
  label,
  value,
  onChange,
  minimumDate,
  sub,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  minimumDate?: Date;
  sub?: string;
}) {
  return (
    <DateField
      label={label}
      value={value}
      onChange={onChange}
      minimumDate={minimumDate}
      trigger={(open) => <Tile icon="calendar-outline" label={label} value={value ? tileDate(value) : ""} placeholder="Add date" sub={sub} onPress={open} style={styles.flex} />}
    />
  );
}

/** Bottom sheet with a title. */
export function Sheet({ visible, title, onClose, children, tall = false }: { visible: boolean; title: string; onClose: () => void; children: ReactNode; tall?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={[styles.sheet, tall && styles.sheetTall, { paddingBottom: insets.bottom + space.lg }]}>
        <View style={styles.grabber} />
        <View style={styles.sheetHead}>
          <Text style={styles.sheetTitle}>{title}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={10} style={styles.close}>
            <Ionicons name="close" size={18} color={colors.ink} />
          </Pressable>
        </View>
        {children}
      </View>
    </Modal>
  );
}

/** Searchable airport list. */
export function AirportSheet({
  visible,
  title,
  exclude,
  onPick,
  onClose,
}: {
  visible: boolean;
  title: string;
  exclude?: string;
  onPick: (a: Airport) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const all = useMemo(() => allAirports(), []);
  const list = useMemo(() => searchAirports(all, q, exclude), [all, q, exclude]);
  const close = () => {
    setQ("");
    onClose();
  };
  return (
    <Sheet visible={visible} title={title} onClose={close} tall>
      <View style={styles.search}>
        <Ionicons name="search" size={17} color={colors.inkFaint} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="City or airport code"
          placeholderTextColor={colors.inkFaint}
          style={styles.searchInput}
          autoFocus
          autoCorrect={false}
          autoCapitalize="none"
          accessibilityLabel="Search airports"
        />
      </View>
      <FlatList
        data={list}
        keyExtractor={(a) => a.code}
        keyboardShouldPersistTaps="handled"
        style={styles.list}
        ListHeaderComponent={!q ? <Text style={styles.listHead}>Popular</Text> : undefined}
        ListEmptyComponent={<Text style={styles.empty}>No airport matches “{q}”. Try a city name or 3-letter code.</Text>}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              tap();
              setQ("");
              onPick(item);
            }}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <View style={styles.rowIcon}>
              <Ionicons name="airplane" size={15} color={colors.accent} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.rowCity}>{item.city}</Text>
              <Text style={styles.rowLabel} numberOfLines={1}>
                {item.label}
              </Text>
            </View>
            <Text style={styles.rowCode}>{item.code}</Text>
          </Pressable>
        )}
      />
    </Sheet>
  );
}

/** Free-text place sheet with suggestions (hotels and car pick-ups). */
export function PlaceSheet({
  visible,
  title,
  placeholder,
  suggestions,
  onPick,
  onClose,
}: {
  visible: boolean;
  title: string;
  placeholder: string;
  suggestions: string[];
  onPick: (place: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const list = q.trim() ? suggestions.filter((s) => s.toLowerCase().includes(q.trim().toLowerCase())) : suggestions;
  const pick = (v: string) => {
    tap();
    setQ("");
    onPick(v);
  };
  return (
    <Sheet visible={visible} title={title} onClose={() => (setQ(""), onClose())} tall>
      <View style={styles.search}>
        <Ionicons name="search" size={17} color={colors.inkFaint} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={placeholder}
          placeholderTextColor={colors.inkFaint}
          style={styles.searchInput}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={() => q.trim() && pick(q.trim())}
          accessibilityLabel={title}
        />
      </View>
      <FlatList
        data={list}
        keyExtractor={(s) => s}
        keyboardShouldPersistTaps="handled"
        style={styles.list}
        ListHeaderComponent={
          q.trim() && !list.some((s) => s.toLowerCase() === q.trim().toLowerCase()) ? (
            <Pressable accessibilityRole="button" onPress={() => pick(q.trim())} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
              <View style={styles.rowIcon}>
                <Ionicons name="search" size={15} color={colors.accent} />
              </View>
              <Text style={[styles.rowCity, styles.flex]}>Use “{q.trim()}”</Text>
            </Pressable>
          ) : undefined
        }
        renderItem={({ item }) => (
          <Pressable accessibilityRole="button" onPress={() => pick(item)} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
            <View style={styles.rowIcon}>
              <Ionicons name="location-outline" size={15} color={colors.accent} />
            </View>
            <Text style={[styles.rowCity, styles.flex]}>{item}</Text>
          </Pressable>
        )}
      />
    </Sheet>
  );
}

/** − n + row. */
export function Counter({ label, sub, value, min, max, onChange }: { label: string; sub?: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  const step = (d: number) => {
    tap();
    onChange(Math.min(max, Math.max(min, value + d)));
  };
  return (
    <View style={styles.counter}>
      <View style={styles.flex}>
        <Text style={styles.counterLabel}>{label}</Text>
        {sub ? <Text style={styles.rowLabel}>{sub}</Text> : null}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Fewer ${label.toLowerCase()}`} disabled={value <= min} onPress={() => step(-1)} style={[styles.countBtn, value <= min && styles.off]}>
        <Ionicons name="remove" size={18} color={colors.ink} />
      </Pressable>
      <Text style={styles.countValue} accessibilityLiveRegion="polite">
        {value}
      </Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`More ${label.toLowerCase()}`} disabled={value >= max} onPress={() => step(1)} style={[styles.countBtn, value >= max && styles.off]}>
        <Ionicons name="add" size={18} color={colors.ink} />
      </Pressable>
    </View>
  );
}

/** Small two/three-way switch. */
export function Toggle<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={styles.toggle} accessibilityRole="radiogroup">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => {
              tap();
              onChange(o.value);
            }}
            style={[styles.toggleBtn, on && styles.toggleOn]}
          >
            <Text style={[styles.toggleText, on && styles.toggleTextOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.85 },
  off: { opacity: 0.35 },
  tile: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    gap: 2,
    minHeight: 64,
    justifyContent: "center",
  },
  tileHead: { flexDirection: "row", alignItems: "center", gap: 4 },
  tileLabel: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase", color: colors.inkFaint },
  tileValue: { fontFamily: fonts.displaySemi, fontSize: 17, color: colors.ink },
  tilePlaceholder: { color: colors.inkFaint },
  tileSub: { fontFamily: fonts.body, fontSize: 12, color: colors.inkSoft },

  backdrop: { flex: 1, backgroundColor: "rgba(11,18,25,0.35)" },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: space.lg, paddingTop: space.sm, gap: space.sm },
  sheetTall: { height: "85%" },
  grabber: { alignSelf: "center", width: 38, height: 5, borderRadius: 3, backgroundColor: colors.line, marginBottom: space.xs },
  sheetHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: space.xs },
  sheetTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  close: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },

  search: { flexDirection: "row", alignItems: "center", gap: space.sm, backgroundColor: colors.bg, borderRadius: radius.md, paddingHorizontal: space.md, minHeight: 46 },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 16, color: colors.ink, paddingVertical: 10 },
  list: { flex: 1 },
  listHead: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", color: colors.inkFaint, marginTop: space.sm, marginBottom: 4 },
  empty: { fontFamily: fonts.body, fontSize: 14, color: colors.inkSoft, paddingVertical: space.lg, textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 56, paddingHorizontal: 4, borderRadius: radius.sm },
  rowPressed: { backgroundColor: colors.bg },
  rowIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" },
  rowCity: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.ink },
  rowLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.inkSoft },
  rowCode: { fontFamily: fonts.display, fontSize: 15, color: colors.inkSoft },

  counter: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 60 },
  counterLabel: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.ink },
  countBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", backgroundColor: colors.card },
  countValue: { fontFamily: fonts.display, fontSize: 18, color: colors.ink, minWidth: 24, textAlign: "center" },

  toggle: { flexDirection: "row", backgroundColor: colors.bg, borderRadius: radius.pill, padding: 3, alignSelf: "flex-start" },
  toggleBtn: { paddingHorizontal: space.md, minHeight: 32, borderRadius: radius.pill, justifyContent: "center" },
  toggleOn: { backgroundColor: colors.ink },
  toggleText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.inkSoft },
  toggleTextOn: { color: colors.onBtn },
});
