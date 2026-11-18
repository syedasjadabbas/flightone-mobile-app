import { useState } from "react";
import { Text } from "react-native";
import { Button, Card, Notice, Tag } from "@/core/components";
import { formatApiError } from "@/core/api/formatApiError";
import { type } from "@/core/theme/tokens";
import { useRequestApprovalMutation, type ApprovalGate } from "@/features/corporate/api/corporateApi";
import { useCorporateProfileStore } from "@/features/corporate/store/corporateProfile.store";

const STATUS_TEXT: Record<string, string> = {
  APPROVED: "Approved",
  PENDING: "Waiting for approval",
  REJECTED: "Rejected",
  REQUIRED: "Approval needed",
};

/** Company booking: approval status and policy check (same rules as web's CheckoutCorporateSection). */
export function CorporateGate({ bookingId, gate, onChange }: { bookingId: string; gate: ApprovalGate; onChange: () => void }) {
  const storeCompanyId = useCorporateProfileStore((s) => s.companyId);
  const [request, { isLoading }] = useRequestApprovalMutation();
  const [error, setError] = useState<string | null>(null);
  const status = gate.approvalStatus ?? "REQUIRED";
  const violations = gate.policyEvaluation?.violations ?? [];

  return (
    <Card>
      <Text style={type.h3}>Company approval</Text>
      <Tag label={STATUS_TEXT[status] ?? status.toLowerCase()} tone={gate.canProceed ? "success" : "accent"} />
      <Text style={type.bodySoft}>{gate.canProceed ? "You can pay now." : "Payment is blocked until this booking is approved."}</Text>
      {violations.map((v) => (
        <Text key={v.code} style={type.bodySoft}>
          • {v.message}
        </Text>
      ))}
      {error ? <Notice message={error} /> : null}
      {status === "REQUIRED" ? (
        <Button
          label="Request approval"
          loading={isLoading}
          onPress={async () => {
            setError(null);
            const companyId = storeCompanyId || gate.companyId;
            if (!companyId) return setError("Choose your company in More → Corporate first.");
            try {
              await request({ bookingId, companyId }).unwrap();
              onChange();
            } catch (err) {
              setError(formatApiError(err));
            }
          }}
        />
      ) : null}
      {status === "PENDING" ? <Button label="Check again" variant="ghost" onPress={onChange} /> : null}
    </Card>
  );
}
