import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { colors, fonts, radius, space } from "@/core/theme/tokens";

type IconName = keyof typeof Ionicons.glyphMap;
export type MenuAction = { label: string; icon?: IconName; destructive?: boolean; onPress: () => void };

/**
 * A "⋯" button that opens a bottom sheet of actions, so list rows stay clean
 * instead of each showing its own Share / Remove / … buttons.
 */
export function ActionMenu({ title, actions, accessibilityLabel }: { title?: string; actions: MenuAction[]; accessibilityLabel?: string }) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  if (!actions.length) return null;

  const run = (a: MenuAction) => {
    setOpen(false);
    // Let the sheet close before the action (which may open a share sheet or a confirm dialog).
    setTimeout(a.onPress, 250);
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? `More actions${title ? ` for ${title}` : ""}`}
        hitSlop={10}
        onPress={() => {
          void Haptics.selectionAsync().catch(() => {});
          setOpen(true);
        }}
        style={({ pressed }) => [styles.dots, pressed && styles.pressed]}
      >
        <Ionicons name="ellipsis-horizontal" size={18} color={colors.inkSoft} />
      </Pressable>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + space.md }]}>
          <View style={styles.grabber} />
          {title ? (
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>
          ) : null}
          <View style={styles.group}>
            {actions.map((a, i) => (
              <Pressable
                key={a.label}
                accessibilityRole="button"
                onPress={() => run(a)}
                style={({ pressed }) => [styles.row, i > 0 && styles.divider, pressed && styles.rowPressed]}
              >
                {a.icon ? <Ionicons name={a.icon} size={19} color={a.destructive ? colors.danger : colors.ink} /> : null}
                <Text style={[styles.label, a.destructive && styles.danger]}>{a.label}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={({ pressed }) => [styles.cancel, pressed && styles.rowPressed]}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  dots: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  pressed: { opacity: 0.7 },
  backdrop: { flex: 1, backgroundColor: "rgba(11,18,25,0.35)" },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: space.lg, paddingTop: space.sm, gap: space.md },
  grabber: { alignSelf: "center", width: 38, height: 5, borderRadius: 3, backgroundColor: colors.line },
  title: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.inkSoft, textAlign: "center" },
  group: { backgroundColor: colors.card, borderRadius: radius.md + 2, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 54, paddingHorizontal: space.lg },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  rowPressed: { backgroundColor: "#eef2f6" },
  label: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.ink },
  danger: { color: colors.danger },
  cancel: { backgroundColor: colors.card, borderRadius: radius.md + 2, minHeight: 54, alignItems: "center", justifyContent: "center" },
  cancelText: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.accent },
});
