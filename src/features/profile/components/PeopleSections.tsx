import { useState } from "react";
import { Text } from "react-native";
import { Button, Card, ListRow, Notice, TextField, DateField } from "@/core/components";
import { formatApiError } from "@/core/api/formatApiError";
import { confirmAction } from "@/core/lib/confirm";
import { type } from "@/core/theme/tokens";
import { ChoiceRow } from "@/features/checkout/components/ChoiceRow";
import {
  useAddCompanionMutation,
  useAddEmergencyContactMutation,
  useAddLoyaltyMutation,
  useCompanionsQuery,
  useDeleteCompanionMutation,
  useDeleteEmergencyContactMutation,
  useDeleteLoyaltyMutation,
  useEmergencyContactsQuery,
  useLoyaltyQuery,
} from "../api/profileApi";

function useFormMessage() {
  const [msg, setMsg] = useState<string | null>(null);
  return { msg, setMsg, fail: (err: unknown) => setMsg(formatApiError(err)) };
}

/** Saved travel companions / family (reused at checkout). */
export function CompanionsSection() {
  const { data = [] } = useCompanionsQuery();
  const [add, addState] = useAddCompanionMutation();
  const [remove] = useDeleteCompanionMutation();
  const [fullName, setFullName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [dob, setDob] = useState("");
  const { msg, setMsg, fail } = useFormMessage();

  const submit = async () => {
    setMsg(null);
    if (!fullName.trim()) return setMsg("Enter the companion's full name.");
    if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob.trim())) return setMsg("Date of birth looks like 2015-03-09.");
    try {
      await add({ fullName: fullName.trim(), relationship: relationship.trim() || undefined, dateOfBirth: dob.trim() || undefined }).unwrap();
      setFullName("");
      setRelationship("");
      setDob("");
    } catch (err) {
      fail(err);
    }
  };

  return (
    <Card>
      <Text style={type.h3}>Companions</Text>
      {data.length ? (
        data.map((c) => (
          <ListRow
            key={c.id}
            title={c.fullName}
            detail={[c.relationship, c.dateOfBirth?.slice(0, 10), c.hasPassport ? "Passport on file" : null].filter(Boolean).join(" · ")}
            actionLabel="Remove"
            onAction={async () => {
              if (await confirmAction("Remove companion?", `${c.fullName} will be removed from your profile.`, "Remove")) {
                remove(c.id).unwrap().catch(fail);
              }
            }}
          />
        ))
      ) : (
        <Text style={type.bodySoft}>Add the people you travel with so checkout can fill in their details.</Text>
      )}
      <TextField label="Full name (as on passport)" value={fullName} onChangeText={setFullName} />
      <TextField label="Relationship" placeholder="Spouse, child…" value={relationship} onChangeText={setRelationship} />
      <DateField label="Date of birth (optional)" value={dob} onChange={setDob} optional maximumDate={new Date()} />
      {msg ? <Notice message={msg} /> : null}
      <Button label="Add companion" variant="ghost" onPress={submit} loading={addState.isLoading} />
    </Card>
  );
}

export function EmergencySection() {
  const { data = [] } = useEmergencyContactsQuery();
  const [add, addState] = useAddEmergencyContactMutation();
  const [remove] = useDeleteEmergencyContactMutation();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState("");
  const { msg, setMsg, fail } = useFormMessage();

  const submit = async () => {
    setMsg(null);
    if (!fullName.trim() || phone.trim().length < 3) return setMsg("Enter a name and phone number.");
    try {
      await add({ fullName: fullName.trim(), phone: phone.trim(), relationship: relationship.trim() || undefined, isPrimary: data.length === 0 }).unwrap();
      setFullName("");
      setPhone("");
      setRelationship("");
    } catch (err) {
      fail(err);
    }
  };

  return (
    <Card>
      <Text style={type.h3}>Emergency contacts</Text>
      {data.length ? (
        data.map((c) => (
          <ListRow
            key={c.id}
            title={`${c.fullName}${c.isPrimary ? " · Primary" : ""}`}
            detail={[c.relationship, c.phone, c.email].filter(Boolean).join(" · ")}
            actionLabel="Remove"
            onAction={async () => {
              if (await confirmAction("Remove contact?", `${c.fullName} will no longer be contacted in an emergency.`, "Remove")) {
                remove(c.id).unwrap().catch(fail);
              }
            }}
          />
        ))
      ) : (
        <Text style={type.bodySoft}>Who should we contact if something goes wrong on a trip?</Text>
      )}
      <TextField label="Full name" value={fullName} onChangeText={setFullName} />
      <TextField label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <TextField label="Relationship" value={relationship} onChangeText={setRelationship} />
      {msg ? <Notice message={msg} /> : null}
      <Button label="Add contact" variant="ghost" onPress={submit} loading={addState.isLoading} />
    </Card>
  );
}

export function LoyaltySection() {
  const { data = [] } = useLoyaltyQuery();
  const [add, addState] = useAddLoyaltyMutation();
  const [remove] = useDeleteLoyaltyMutation();
  const [kind, setKind] = useState<"AIRLINE" | "HOTEL">("AIRLINE");
  const [programCode, setProgramCode] = useState("");
  const [memberNumber, setMemberNumber] = useState("");
  const { msg, setMsg, fail } = useFormMessage();

  const submit = async () => {
    setMsg(null);
    if (!programCode.trim() || !memberNumber.trim()) return setMsg("Enter the programme and member number.");
    try {
      await add({ type: kind, programCode: programCode.trim().toUpperCase(), memberNumber: memberNumber.trim() }).unwrap();
      setProgramCode("");
      setMemberNumber("");
    } catch (err) {
      fail(err);
    }
  };

  return (
    <Card>
      <Text style={type.h3}>Loyalty programmes</Text>
      {data.length ? (
        data.map((l) => (
          <ListRow
            key={l.id}
            title={`${l.programCode} · ${l.type === "AIRLINE" ? "Airline" : "Hotel"}`}
            detail={l.memberNumber}
            actionLabel="Remove"
            onAction={async () => {
              if (await confirmAction("Remove programme?", `${l.programCode} ${l.memberNumber}`, "Remove")) {
                remove(l.id).unwrap().catch(fail);
              }
            }}
          />
        ))
      ) : (
        <Text style={type.bodySoft}>Add frequent-flyer and hotel memberships so Ava can favour them.</Text>
      )}
      <ChoiceRow
        label="Type"
        options={[
          { value: "AIRLINE", label: "Airline" },
          { value: "HOTEL", label: "Hotel" },
        ]}
        value={kind}
        onChange={setKind}
      />
      <TextField label="Programme code" placeholder="EK, QR, MARRIOTT…" value={programCode} onChangeText={setProgramCode} autoCapitalize="characters" maxLength={20} />
      <TextField label="Member number" value={memberNumber} onChangeText={setMemberNumber} autoCapitalize="characters" maxLength={40} />
      {msg ? <Notice message={msg} /> : null}
      <Button label="Add programme" variant="ghost" onPress={submit} loading={addState.isLoading} />
    </Card>
  );
}
