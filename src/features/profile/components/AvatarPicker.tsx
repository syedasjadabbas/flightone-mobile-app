import { useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import Ionicons from "@expo/vector-icons/Ionicons";
import { formatApiError } from "@/core/api/formatApiError";
import { colors, fonts } from "@/core/theme/tokens";
import { useUpdateProfileMutation } from "../api/profileApi";

const SIZE = 512;

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

/**
 * Profile photo. Same storage as the web: a ≤512px JPEG data URL in
 * `profile.metadata.avatarUrl` (the API has no separate upload endpoint).
 */
export function AvatarPicker({
  name,
  metadata,
  onError,
}: {
  name: string;
  metadata: unknown;
  onError: (msg: string) => void;
}) {
  const [update] = useUpdateProfileMutation();
  const [busy, setBusy] = useState(false);
  const meta = (metadata && typeof metadata === "object" ? metadata : {}) as Record<string, unknown>;
  const avatarUrl = typeof meta.avatarUrl === "string" ? meta.avatarUrl : null;

  const save = async (url: string | null) => {
    const next = { ...meta };
    if (url) next.avatarUrl = url;
    else delete next.avatarUrl;
    await update({ metadata: next }).unwrap();
  };

  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 1 });
    if (res.canceled || !res.assets?.[0]) return;
    setBusy(true);
    try {
      const ctx = ImageManipulator.manipulate(res.assets[0].uri);
      ctx.resize({ width: SIZE, height: SIZE });
      const image = await ctx.renderAsync();
      const out = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
      if (!out.base64) throw new Error("Couldn't read that photo.");
      await save(`data:image/jpeg;base64,${out.base64}`);
    } catch (err) {
      onError(formatApiError(err, "Couldn't update your photo."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Pressable accessibilityRole="button" accessibilityLabel="Change profile photo" onPress={pick} disabled={busy} style={styles.avatar}>
        {avatarUrl ? <Image source={{ uri: avatarUrl }} style={styles.image} accessibilityIgnoresInvertColors /> : <Text style={styles.initials}>{initials(name) || "FO"}</Text>}
        <View style={styles.badge}>
          {busy ? <ActivityIndicator size="small" color={colors.onBtn} /> : <Ionicons name="camera" size={12} color={colors.onBtn} />}
        </View>
      </Pressable>
      {avatarUrl && !busy ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => save(null).catch((e) => onError(formatApiError(e)))}
          hitSlop={8}
        >
          <Text style={styles.remove}>Remove</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: 4 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" },
  image: { width: 64, height: 64, borderRadius: 32 },
  initials: { fontFamily: fonts.display, fontSize: 22, color: colors.onBtn },
  badge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.card,
  },
  remove: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.inkSoft },
});
