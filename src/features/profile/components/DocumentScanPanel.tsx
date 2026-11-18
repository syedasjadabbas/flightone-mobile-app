import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button, DateField, Notice, TextField } from "@/core/components";
import { formatApiError } from "@/core/api/formatApiError";
import { colors, radius, space, type } from "@/core/theme/tokens";
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
export function DocumentScanPanel({ documentId, onDone }: { documentId: string; onDone?: () => void }) {
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
      <Text style={type.label}>Document details</Text>
      <Text style={type.bodySoft}>{ocrStatusMessage(status)}</Text>
      {status === "idle" || status === "failure" ? (
        <Button label={status === "failure" ? "Try scanning again" : "Scan details from my upload"} variant="ghost" onPress={runScan} />
      ) : null}
      {status === "processing" ? null : status !== "idle" ? (
        <>
          <TextField label="Document number" value={fields.documentNumber} onChangeText={set("documentNumber")} autoCapitalize="characters" />
          <TextField
            label="Issuing country"
            hint="2-letter code, e.g. PK"
            value={fields.countryCode}
            onChangeText={(t) => set("countryCode")(t.toUpperCase().slice(0, 2))}
            autoCapitalize="characters"
            maxLength={2}
          />
          <DateField label="Issued" value={fields.issuedAt} onChange={set("issuedAt")} maximumDate={new Date()} optional />
          <DateField label="Expires" value={fields.expiresAt} onChange={set("expiresAt")} optional />
          {message ? <Notice tone={message.tone} message={message.text} /> : null}
          <Button label="Save details" onPress={confirm} loading={applyState.isLoading || updateState.isLoading} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: space.sm, backgroundColor: colors.bg, borderRadius: radius.sm, padding: space.md, marginTop: space.xs },
});
