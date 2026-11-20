import { useState } from "react";
import { Linking } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Button, DateField, EmptyState, Notice, SkeletonList, TextField, type MenuAction } from "@/core/components";
import { formatApiError } from "@/core/api/formatApiError";
import { confirmAction } from "@/core/lib/confirm";
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
  type LoyaltyMembership,
} from "../api/profileApi";
import { AddButton, FieldPair, FormCard, ItemRow, ListGroup, ToneTag, formatDay, hapticSuccess, initials } from "./SectionParts";

function useFormMessage() {
  const [msg, setMsg] = useState<string | null>(null);
  return { msg, setMsg, fail: (err: unknown) => setMsg(formatApiError(err)) };
}

/** Open/close state for an in-place add form; closing clears its message. */
function useAddForm(clear: () => void) {
  const [open, setOpen] = useState(false);
  return {
    open,
    show: () => {
      clear();
      setOpen(true);
    },
    hide: () => {
      clear();
      setOpen(false);
    },
  };
}

/** Saved travel companions / family (reused at checkout). */
export function CompanionsSection() {
  const { data = [], isLoading, error } = useCompanionsQuery();
  const [add, addState] = useAddCompanionMutation();
  const [remove] = useDeleteCompanionMutation();
  const [fullName, setFullName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [dob, setDob] = useState("");
  const { msg, setMsg, fail } = useFormMessage();
  const form = useAddForm(() => setMsg(null));

  const submit = async () => {
    setMsg(null);
    if (!fullName.trim()) return setMsg("Enter the companion's full name.");
    if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob.trim())) return setMsg("Date of birth looks like 2015-03-09.");
    try {
      await add({ fullName: fullName.trim(), relationship: relationship.trim() || undefined, dateOfBirth: dob.trim() || undefined }).unwrap();
      setFullName("");
      setRelationship("");
      setDob("");
      hapticSuccess();
      form.hide();
    } catch (err) {
      fail(err);
    }
  };

  return (
    <>
      {error ? <Notice message={formatApiError(error)} /> : null}
      {msg && !form.open ? <Notice message={msg} /> : null}
      {isLoading ? (
        <SkeletonList count={3} />
      ) : data.length ? (
        <ListGroup label={`Saved · ${data.length}`}>
            {data.map((c, i) => (
              <ItemRow
                key={c.id}
                title={c.fullName}
                avatar={{ initials: initials(c.fullName) }}
                tint={c.kind === "FAMILY" ? "violet" : "blue"}
                detail={[c.relationship, c.dateOfBirth ? `Born ${formatDay(c.dateOfBirth)}` : null].filter(Boolean).join(" · ") || "No details yet"}
                tags={c.hasPassport ? <ToneTag label="Passport" tint="green" icon="checkmark" /> : null}
                last={i === data.length - 1}
                actions={[
                  {
                    label: "Remove",
                    icon: "trash-outline",
                    destructive: true,
                    onPress: async () => {
                      if (await confirmAction("Remove companion?", `${c.fullName} will be removed from your profile.`, "Remove")) {
                        remove(c.id).unwrap().catch(fail);
                      }
                    },
                  },
                ]}
              />
            ))}
        </ListGroup>
      ) : !form.open ? (
        <EmptyState
          icon="people-outline"
          title="No companions yet"
          body="Add the people you travel with so checkout can fill in their details."
          actionLabel="Add companion"
          onAction={form.show}
        />
      ) : null}

      {form.open ? (
        <FormCard title="New companion" subtitle="Name exactly as on their passport" icon="person-add-outline" onClose={form.hide}>
          <TextField label="Full name" icon="person-outline" placeholder="As on passport" value={fullName} onChangeText={setFullName} />
          <FieldPair
            first={<TextField label="Relationship" placeholder="Spouse, child…" value={relationship} onChangeText={setRelationship} />}
            second={<DateField label="Date of birth" value={dob} onChange={setDob} optional maximumDate={new Date()} />}
          />
          {msg ? <Notice message={msg} /> : null}
          <Button label="Add companion" onPress={submit} loading={addState.isLoading} />
        </FormCard>
      ) : !isLoading && data.length ? (
        <AddButton label="Add a companion" detail="Family or friends you book for" onPress={form.show} />
      ) : null}
    </>
  );
}

export function EmergencySection() {
  const { data = [], isLoading, error } = useEmergencyContactsQuery();
  const [add, addState] = useAddEmergencyContactMutation();
  const [remove] = useDeleteEmergencyContactMutation();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState("");
  const { msg, setMsg, fail } = useFormMessage();
  const form = useAddForm(() => setMsg(null));

  const submit = async () => {
    setMsg(null);
    if (!fullName.trim() || phone.trim().length < 3) return setMsg("Enter a name and phone number.");
    try {
      await add({ fullName: fullName.trim(), phone: phone.trim(), relationship: relationship.trim() || undefined, isPrimary: data.length === 0 }).unwrap();
      setFullName("");
      setPhone("");
      setRelationship("");
      hapticSuccess();
      form.hide();
    } catch (err) {
      fail(err);
    }
  };

  return (
    <>
      {error ? <Notice message={formatApiError(error)} /> : null}
      {msg && !form.open ? <Notice message={msg} /> : null}
      {isLoading ? (
        <SkeletonList count={2} />
      ) : data.length ? (
        <ListGroup label={`Contacts · ${data.length}`}>
            {data.map((c, i) => {
              const actions: MenuAction[] = [];
              if (c.phone) actions.push({ label: `Call ${c.phone}`, icon: "call-outline", onPress: () => void Linking.openURL(`tel:${c.phone.replace(/[^\d+]/g, "")}`).catch(() => {}) });
              if (c.email) actions.push({ label: "Send email", icon: "mail-outline", onPress: () => void Linking.openURL(`mailto:${c.email}`).catch(() => {}) });
              actions.push({
                label: "Remove",
                icon: "trash-outline",
                destructive: true,
                onPress: async () => {
                  if (await confirmAction("Remove contact?", `${c.fullName} will no longer be contacted in an emergency.`, "Remove")) {
                    remove(c.id).unwrap().catch(fail);
                  }
                },
              });
              return (
                <ItemRow
                  key={c.id}
                  title={c.fullName}
                  avatar={{ initials: initials(c.fullName) }}
                  tint={c.isPrimary ? "rose" : "slate"}
                  tags={c.isPrimary ? <ToneTag label="Primary" tint="rose" /> : null}
                  detail={[c.relationship, c.phone].filter(Boolean).join(" · ")}
                  last={i === data.length - 1}
                  actions={actions}
                />
              );
            })}
        </ListGroup>
      ) : !form.open ? (
        <EmptyState
          icon="medkit-outline"
          tint="rose"
          title="No emergency contact"
          body="Who should we contact if something goes wrong on a trip?"
          actionLabel="Add contact"
          onAction={form.show}
        />
      ) : null}

      {form.open ? (
        <FormCard
          title="New emergency contact"
          subtitle={data.length === 0 ? "Your first contact becomes the primary one" : "Someone we can reach while you travel"}
          icon="person-add-outline"
          tint="rose"
          onClose={form.hide}
        >
          <TextField label="Full name" icon="person-outline" value={fullName} onChangeText={setFullName} />
          <FieldPair
            first={<TextField label="Phone" placeholder="+92…" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />}
            second={<TextField label="Relationship" placeholder="Parent, partner…" value={relationship} onChangeText={setRelationship} />}
          />
          {msg ? <Notice message={msg} /> : null}
          <Button label="Add contact" onPress={submit} loading={addState.isLoading} />
        </FormCard>
      ) : !isLoading && data.length ? (
        <AddButton label="Add a contact" detail="Family or a friend back home" onPress={form.show} />
      ) : null}
    </>
  );
}

const KIND_META = {
  AIRLINE: { label: "Airline", group: "Airlines", icon: "airplane-outline", tint: "teal" },
  HOTEL: { label: "Hotel", group: "Hotels", icon: "bed-outline", tint: "violet" },
} as const;

export function LoyaltySection() {
  const { data = [], isLoading, error } = useLoyaltyQuery();
  const [add, addState] = useAddLoyaltyMutation();
  const [remove] = useDeleteLoyaltyMutation();
  const [kind, setKind] = useState<"AIRLINE" | "HOTEL">("AIRLINE");
  const [programCode, setProgramCode] = useState("");
  const [memberNumber, setMemberNumber] = useState("");
  const { msg, setMsg, fail } = useFormMessage();
  const [copied, setCopied] = useState<string | null>(null);
  const form = useAddForm(() => setMsg(null));

  const submit = async () => {
    setMsg(null);
    if (!programCode.trim() || !memberNumber.trim()) return setMsg("Enter the programme and member number.");
    try {
      await add({ type: kind, programCode: programCode.trim().toUpperCase(), memberNumber: memberNumber.trim() }).unwrap();
      setProgramCode("");
      setMemberNumber("");
      hapticSuccess();
      form.hide();
    } catch (err) {
      fail(err);
    }
  };

  const groups = (["AIRLINE", "HOTEL"] as const)
    .map((k) => ({ kind: k, items: data.filter((l) => l.type === k) }))
    .filter((g) => g.items.length);

  const rowActions = (l: LoyaltyMembership): MenuAction[] => [
    {
      label: "Copy member number",
      icon: "copy-outline",
      onPress: () => {
        void Clipboard.setStringAsync(l.memberNumber)
          .then(() => {
            hapticSuccess();
            setCopied(`${l.programCode} number copied.`);
          })
          .catch(() => {});
      },
    },
    {
      label: "Remove",
      icon: "trash-outline",
      destructive: true,
      onPress: async () => {
        if (await confirmAction("Remove programme?", `${l.programCode} ${l.memberNumber}`, "Remove")) {
          remove(l.id).unwrap().catch(fail);
        }
      },
    },
  ];

  return (
    <>
      {error ? <Notice message={formatApiError(error)} /> : null}
      {msg && !form.open ? <Notice message={msg} /> : null}
      {copied ? <Notice tone="success" message={copied} /> : null}
      {isLoading ? (
        <SkeletonList count={2} />
      ) : groups.length ? (
        groups.map((g) => (
          <ListGroup key={g.kind} label={`${KIND_META[g.kind].group} · ${g.items.length}`}>
            {g.items.map((l, i) => (
              <ItemRow
                key={l.id}
                title={l.programCode}
                avatar={{ icon: KIND_META[l.type].icon }}
                tint={KIND_META[l.type].tint}
                detail={`${KIND_META[l.type].label} · ${l.memberNumber}`}
                menuTitle={`${l.programCode} · ${l.memberNumber}`}
                last={i === g.items.length - 1}
                actions={rowActions(l)}
              />
            ))}
          </ListGroup>
        ))
      ) : !form.open ? (
        <EmptyState
          icon="ribbon-outline"
          tint="amber"
          title="No memberships yet"
          body="Add frequent-flyer and hotel memberships so Ava can favour them."
          actionLabel="Add programme"
          onAction={form.show}
        />
      ) : null}

      {form.open ? (
        <FormCard title="New membership" subtitle="Frequent-flyer or hotel rewards" icon="ribbon-outline" tint="amber" onClose={form.hide}>
          <ChoiceRow
            label="Type"
            options={[
              { value: "AIRLINE", label: "Airline" },
              { value: "HOTEL", label: "Hotel" },
            ]}
            value={kind}
            onChange={setKind}
          />
          <FieldPair
            narrow={128}
            first={
              <TextField label="Programme" placeholder="EK, QR…" value={programCode} onChangeText={setProgramCode} autoCapitalize="characters" maxLength={20} />
            }
            second={<TextField label="Member number" value={memberNumber} onChangeText={setMemberNumber} autoCapitalize="characters" maxLength={40} />}
          />
          {msg ? <Notice message={msg} /> : null}
          <Button label="Add programme" onPress={submit} loading={addState.isLoading} />
        </FormCard>
      ) : !isLoading && data.length ? (
        <AddButton label="Add a membership" detail="Airline or hotel loyalty programme" onPress={form.show} />
      ) : null}
    </>
  );
}

