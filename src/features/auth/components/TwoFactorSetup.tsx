import { useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Button, Notice, TextField } from "@/core/components";
import { formatApiError } from "@/core/api/formatApiError";
import { colors, fonts, radius, space, type } from "@/core/theme/tokens";
import { useTwoFactorConfirmMutation, useTwoFactorSetupMutation } from "../api/authApi";

/**
 * Turn on 2-step verification: get a secret → add it to an authenticator app
 * (open link or copy the key) → save backup codes → confirm with a 6-digit code.
 * `tempToken` is the login challenge token when an account must set this up to sign in.
 */
export function TwoFactorSetup({ tempToken, onEnabled }: { tempToken?: string; onEnabled: () => void }) {
  const [setup, setupState] = useTwoFactorSetupMutation();
  const [confirm, confirmState] = useTwoFactorConfirmMutation();
  const [data, setData] = useState<{ secret: string; uri?: string; backupCodes: string[] } | null>(null);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);

  const start = async () => {
    setMsg(null);
    try {
      const r = await setup(tempToken ? { tempToken } : undefined).unwrap();
      setData({ secret: r.secret, uri: r.otpauthUri || r.otpauthUrl, backupCodes: r.backupCodes ?? [] });
    } catch (err) {
      setMsg({ tone: "error", text: formatApiError(err) });
    }
  };

  if (!data) {
    return (
      <View style={styles.wrap}>
        <Text style={type.bodySoft}>Protect your account with a code from an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password…).</Text>
        {msg ? <Notice tone={msg.tone} message={msg.text} /> : null}
        <Button label="Set up 2-step verification" onPress={start} loading={setupState.isLoading} />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={type.label}>1. Add FlightOne to your authenticator</Text>
      {data.uri ? (
        <Button
          label="Open authenticator app"
          variant="ghost"
          onPress={() => Linking.openURL(data.uri!).catch(() => setMsg({ tone: "info", text: "No authenticator app found — copy the key below instead." }))}
        />
      ) : null}
      <Text style={type.bodySoft}>Or enter this key in the app:</Text>
      <Text style={styles.secret} selectable>
        {data.secret}
      </Text>
      <Button label="Copy key" variant="ghost" onPress={() => Clipboard.setStringAsync(data.secret)} />

      {data.backupCodes.length ? (
        <>
          <Text style={type.label}>2. Save your backup codes</Text>
          <Text style={type.bodySoft}>Each works once if you lose your phone. Keep them somewhere safe.</Text>
          <View style={styles.codes}>
            {data.backupCodes.map((c) => (
              <Text key={c} style={styles.code} selectable>
                {c}
              </Text>
            ))}
          </View>
          <Button label="Copy backup codes" variant="ghost" onPress={() => Clipboard.setStringAsync(data.backupCodes.join("\n"))} />
        </>
      ) : null}

      <Text style={type.label}>{data.backupCodes.length ? "3" : "2"}. Enter the 6-digit code</Text>
      <TextField
        label="Code from your authenticator"
        value={code}
        onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
      />
      {msg ? <Notice tone={msg.tone} message={msg.text} /> : null}
      <Button
        label="Turn on"
        loading={confirmState.isLoading}
        disabled={code.length !== 6}
        onPress={async () => {
          setMsg(null);
          try {
            await confirm({ code, ...(tempToken ? { tempToken } : {}) }).unwrap();
            onEnabled();
          } catch (err) {
            setMsg({ tone: "error", text: formatApiError(err) });
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  secret: { fontFamily: fonts.bodySemi, fontSize: 16, letterSpacing: 1, color: colors.ink, backgroundColor: colors.bg, padding: space.md, borderRadius: radius.sm },
  codes: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  code: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.ink, backgroundColor: colors.bg, paddingHorizontal: space.sm, paddingVertical: 4, borderRadius: 6 },
});
