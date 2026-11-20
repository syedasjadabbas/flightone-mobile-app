import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Button, DateField, Notice, TextField } from "@/core/components";
import { formatApiError } from "@/core/api/formatApiError";
import { colors, fonts, radius, space, type } from "@/core/theme/tokens";
import { useApplyScannedFieldsMutation, useScanDocumentMutation, useUpdateIdentityDocumentMutation } from "../api/profileApi";
import {
  buildOcrConfirmPlan,
  classifyOcrOutcome,
  editableFieldsFromExtraction,
  emptyEditableFields,
  ocrStatusMessage,
  type EditableOcrFields,
  type OcrExtractionResult,
} from "../lib/ocrReview";

/**
 * Read a passport / ID scan and confirm its details — same flow as the web's
 * DocumentOcrPanel: scan → review/correct → unchanged fields via /ocr/apply,
 * corrected ones via PATCH. Never treats an unconfigured scanner as a result.
 */
export function DocumentScanPanel({ documentId, onDone, onCancel }: { documentId: string; onDone?: () => void; onCancel?: () => void }) {
  const [scan, scanState] = useScanDocumentMutation();
  const [applyFields, applyState] = useApplyScannedFieldsMutation();
  const [update, updateState] = useUpdateIdentityDocumentMutation();
  const [extraction, setExtraction] = useState<OcrExtractionResult | null>(null);
  const [apiError, setApiError] = useState(false);
  const [fields, setFields] = useState<EditableOcrFields>(emptyEditableFields());
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const status = classifyOcrOutcome({ processing: scanState.isLoading, apiError, extraction });
  const set = (k: keyof EditableOcrFields) => (v: string) => setFields((f) => ({ ...f, [k]: v }));

  const runScan = async () => {
    setMessage(null);
    setApiError(false);
    try {
      const r = await scan(documentId).unwrap();
      setExtraction(r.extraction);
      setFields(editableFieldsFromExtraction(r.extraction.fields));
    } catch {
      setApiError(true);
    }
  };

  const confirm = async () => {
    const plan = buildOcrConfirmPlan(fields, extraction);
    if (!plan.canConfirm) return setMessage({ tone: "error", text: "Enter at least one detail to save." });
    try {
      if (plan.acceptedFields.length) await applyFields({ id: documentId, acceptedFields: plan.acceptedFields }).unwrap();
      if (Object.keys(plan.patch).length) await update({ id: documentId, patch: plan.patch }).unwrap();
      setMessage({ tone: "success", text: "Document details saved." });
      onDone?.();
    } catch (err) {
      setMessage({ tone: "error", text: formatApiError(err) });
    }
  };

  return (
    <View style={styles.panel}>
      <View style={styles.head}>
        <View style={styles.badge}>
          <Ionicons name="scan-outline" size={16} color={colors.accent} />
        </View>
        <Text style={styles.title}>Document details</Text>
        {onCancel ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Close scan" hitSlop={10} onPress={onCancel} style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
            <Ionicons name="close" size={16} color={colors.inkSoft} />
          </Pressable>
        ) : null}
      </View>
      <Text style={type.bodySoft}>{ocrStatusMessage(status)}</Text>
      {status === "idle" || status === "failure" ? (
        <Button label={status === "failure" ? "Try scanning again" : "Scan details from my upload"} variant="ghost" onPress={runScan} />
      ) : null}
      {status === "processing" ? null : status !== "idle" ? (
        <>
          <View style={styles.pair}>
            <View style={styles.narrow}>
              <TextField
                label="Country"
                hint="e.g. PK"
                value={fields.countryCode}
                onChangeText={(t) => set("countryCode")(t.toUpperCase().slice(0, 2))}
                autoCapitalize="characters"
                maxLength={2}
              />
            </View>
            <View style={styles.flex}>
              <TextField label="Document number" value={fields.documentNumber} onChangeText={set("documentNumber")} autoCapitalize="characters" />
            </View>
          </View>
          <View style={styles.pair}>
            <View style={styles.flex}>
              <DateField label="Issued" value={fields.issuedAt} onChange={set("issuedAt")} maximumDate={new Date()} optional />
            </View>
            <View style={styles.flex}>
              <DateField label="Expires" value={fields.expiresAt} onChange={set("expiresAt")} optional />
            </View>
          </View>
          {message ? <Notice tone={message.tone} message={message.text} /> : null}
          <Button label="Save details" onPress={confirm} loading={applyState.isLoading || updateState.isLoading} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: space.md,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    padding: space.md,
    marginTop: space.xs,
  },
  head: { flexDirection: "row", alignItems: "center", gap: space.sm },
  badge: { width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: colors.accentSoft },
  title: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 14, color: colors.ink },
  close: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.card },
  pressed: { opacity: 0.7 },
  pair: { flexDirection: "row", gap: space.sm, alignItems: "flex-start" },
  narrow: { width: 96 },
  flex: { flex: 1 },
});
