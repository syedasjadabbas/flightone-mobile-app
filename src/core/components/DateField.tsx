import { useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, fonts, radius, space, type } from "@/core/theme/tokens";
import { TextField } from "./TextField";

type Mode = "date" | "time";

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-12-09" ⇄ Date (local midnight), "09:30" ⇄ Date (today at that time). */
function toDate(value: string, mode: Mode): Date {
  const now = new Date();
  if (mode === "time") {
    const m = /^(\d{2}):(\d{2})$/.exec(value);
    if (m) now.setHours(Number(m[1]), Number(m[2]), 0, 0);
    return now;
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : now;
}

function fromDate(d: Date, mode: Mode): string {
  return mode === "time" ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function display(value: string, mode: Mode): string {
  if (!value) return "";
  if (mode === "time") return value;
  const d = toDate(value, "date");
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

/**
 * Date (or time) field. Value is "YYYY-MM-DD" (or "HH:MM") so screens keep their
 * string logic. Native calendar on iOS/Android; typed input in the web preview.
 */
export function DateField({
  label,
  value,
  onChange,
  mode = "date",
  minimumDate,
  maximumDate,
  hint,
  optional = false,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  mode?: Mode;
  minimumDate?: Date;
  maximumDate?: Date;
  hint?: string;
  optional?: boolean;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(() => toDate(value, mode));

  if (Platform.OS === "web") {
    return (
      <TextField
        label={label}
        hint={hint ?? (mode === "time" ? "HH:MM" : "YYYY-MM-DD")}
        value={value}
        onChangeText={onChange}
        maxLength={mode === "time" ? 5 : 10}
        error={error}
      />
    );
  }

  const openPicker = () => {
    const current = value ? toDate(value, mode) : (minimumDate ?? new Date());
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: current,
        mode,
        is24Hour: true,
        minimumDate,
        maximumDate,
        onChange: (e: DateTimePickerEvent, d?: Date) => {
          if (e.type === "set" && d) onChange(fromDate(d, mode));
        },
      });
      return;
    }
    setDraft(current);
    setOpen(true);
  };

  return (
    <View style={styles.wrap}>
      <Text style={type.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}${value ? `, ${display(value, mode)}` : ", not set"}`}
        accessibilityHint="Opens a picker"
        onPress={openPicker}
        style={[styles.field, Boolean(error) && styles.invalid]}
      >
        <Text style={[styles.value, !value && styles.placeholder]}>
          {value ? display(value, mode) : mode === "time" ? "Choose a time" : "Choose a date"}
        </Text>
        <Ionicons name={mode === "time" ? "time-outline" : "calendar-outline"} size={18} color={colors.inkSoft} />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {optional && value ? (
        <Pressable accessibilityRole="button" onPress={() => onChange("")} hitSlop={8}>
          <Text style={styles.clear}>Clear</Text>
        </Pressable>
      ) : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel="Close picker" />
        <View style={styles.sheet}>
          <View style={styles.sheetHead}>
            <Pressable accessibilityRole="button" onPress={() => setOpen(false)} hitSlop={10}>
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
            <Text style={type.h3}>{label}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                onChange(fromDate(draft, mode));
                setOpen(false);
              }}
              hitSlop={10}
            >
              <Text style={styles.done}>Done</Text>
            </Pressable>
          </View>
          <DateTimePicker
            value={draft}
            mode={mode}
            display={mode === "date" ? "inline" : "spinner"}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onChange={(_e, d) => d && setDraft(d)}
            accentColor={colors.accent}
            themeVariant="light"
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  field: {
    minHeight: 48,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    paddingHorizontal: space.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  invalid: { borderColor: colors.danger },
  value: { fontFamily: fonts.body, fontSize: 15, color: colors.ink },
  placeholder: { color: colors.inkFaint },
  hint: { fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft },
  error: { fontFamily: fonts.body, fontSize: 13, color: colors.danger },
  clear: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.accent },
  backdrop: { flex: 1, backgroundColor: "rgba(11,18,25,0.35)" },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md, paddingBottom: space.xxl, paddingHorizontal: space.md },
  sheetHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: space.md },
  cancel: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.inkSoft },
  done: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.accent },
});
