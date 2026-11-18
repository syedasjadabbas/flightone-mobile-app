import { Text } from "react-native";
import { Card, TextField } from "@/core/components";
import { type } from "@/core/theme/tokens";
import type { BookingDetail, PayMethod } from "../api/types";
import { ChoiceRow } from "./ChoiceRow";

const LABELS: Record<PayMethod, string> = {
  card: "Card",
  jazzcash: "JazzCash",
  easypaisa: "Easypaisa",
  onelink_ibft: "Bank transfer",
  corporate_credit: "Corporate credit",
};

/** Methods this booking can use: what the server enables; hotels pay by card only (same as web). */
export function availableMethods(booking: BookingDetail): PayMethod[] {
  if (booking.product === "HOTEL") return ["card"];
  const enabled = booking.paymentCapability?.methods;
  const order: PayMethod[] = ["card", "jazzcash", "easypaisa", "onelink_ibft"];
  if (!enabled) return order;
  return order.filter((m) => enabled[m] !== false);
}

export function PaymentSection({
  booking,
  method,
  setMethod,
  cardToken,
  setCardToken,
  accountNumber,
  setAccountNumber,
  disabled,
}: {
  booking: BookingDetail;
  method: PayMethod;
  setMethod: (m: PayMethod) => void;
  cardToken: string;
  setCardToken: (v: string) => void;
  accountNumber: string;
  setAccountNumber: (v: string) => void;
  disabled?: boolean;
}) {
  const methods = availableMethods(booking);
  const simulated = booking.paymentCapability?.mode === "simulated";
  const isHotel = booking.product === "HOTEL";

  return (
    <Card>
      <Text style={type.h3}>Payment</Text>
      {isHotel ? <Text style={type.bodySoft}>Hotels are confirmed the moment you pay, so card payment is used.</Text> : null}
      <ChoiceRow
        label="Pay with"
        options={methods.map((m) => ({ value: m, label: LABELS[m] }))}
        value={method}
        onChange={setMethod}
        disabled={disabled}
      />

      {method === "card" ? (
        simulated ? (
          // Simulated (dev/test) payments only: a processor test token stands in for
          // hosted card fields, which aren't built yet. Customers never see this.
          <TextField
            label="Test card token (development only)"
            placeholder="pm_card_visa"
            value={cardToken}
            onChangeText={setCardToken}
            autoCapitalize="none"
            editable={!disabled}
          />
        ) : (
          <Text style={type.bodySoft}>Card payments open soon. Choose JazzCash, Easypaisa or bank transfer for now.</Text>
        )
      ) : null}

      {method === "jazzcash" || method === "easypaisa" ? (
        <>
          <TextField
            label={method === "jazzcash" ? "JazzCash mobile number" : "Easypaisa mobile number"}
            placeholder="03XXXXXXXXX"
            keyboardType="number-pad"
            value={accountNumber}
            onChangeText={setAccountNumber}
            maxLength={11}
            editable={!disabled}
          />
          <Text style={type.bodySoft}>
            {method === "jazzcash"
              ? "You will receive an MPIN prompt on this number."
              : "You will receive an OTP / PIN prompt on this number."}
          </Text>
        </>
      ) : null}

      {method === "onelink_ibft" ? (
        <Text style={type.bodySoft}>
          Pay generates a 1Bill consumer number. Complete the transfer from any Pakistani banking app within the hold
          window and your ticket is issued once the bank confirms.
        </Text>
      ) : null}
    </Card>
  );
}
