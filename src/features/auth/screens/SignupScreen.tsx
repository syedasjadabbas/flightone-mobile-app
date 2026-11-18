import { useState } from "react";
import { router } from "expo-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Notice } from "@/core/components";
import { formatApiError } from "@/core/api/formatApiError";
import { AuthShell } from "../components/AuthShell";
import { FormField } from "../components/FormField";
import { TextLink } from "../components/TextLink";
import { useRegisterMutation, useResendVerificationMutation, useVerifyEmailMutation } from "../api/authApi";
import { codeSchema, signupSchema, type CodeValues, type SignupValues } from "../schemas";

export function SignupScreen() {
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  if (pendingEmail) return <VerifyEmailStep email={pendingEmail} onBack={() => setPendingEmail(null)} />;
  return <DetailsStep onNeedsVerification={setPendingEmail} />;
}

function DetailsStep({ onNeedsVerification }: { onNeedsVerification: (email: string) => void }) {
  const [register, { isLoading, error }] = useRegisterMutation();
  const [done, setDone] = useState(false);
  const { control, handleSubmit } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit(async (v) => {
    const res = await register({ name: v.name.trim(), email: v.email.trim(), password: v.password })
      .unwrap()
      .catch(() => null);
    if (!res) return;
    if (res.requiresVerification) onNeedsVerification(res.email || v.email.trim());
    else setDone(true);
  });

  return (
    <AuthShell
      title="Create your account"
      subtitle="Plan, book and manage trips by talking to Ava."
      footer={<TextLink lead="Already have an account?" label="Sign in" onPress={() => router.replace("/login")} />}
    >
      {done ? <Notice tone="success" message="Account created. You can sign in now." /> : null}
      {error ? <Notice message={formatApiError(error)} /> : null}
      <FormField control={control} name="name" label="Full name" icon="person-outline" autoComplete="name" textContentType="name" />
      <FormField
        control={control}
        name="email"
        label="Email"
        icon="mail-outline"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <FormField
        control={control}
        name="password"
        label="Password"
        icon="lock-closed-outline"
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        hint="At least 8 characters."
      />
      <FormField
        control={control}
        name="confirmPassword"
        label="Confirm password"
        icon="lock-closed-outline"
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        onSubmitEditing={() => onSubmit()}
      />
      <Button label="Create account" onPress={onSubmit} loading={isLoading} />
    </AuthShell>
  );
}

function VerifyEmailStep({ email, onBack }: { email: string; onBack: () => void }) {
  const [verify, { isLoading, error }] = useVerifyEmailMutation();
  const [resend, resendState] = useResendVerificationMutation();
  const { control, handleSubmit } = useForm<CodeValues>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: "" },
  });

  const onSubmit = handleSubmit(async ({ code }) => {
    // On success the session is stored and the (auth) layout redirects to the app.
    await verify({ email, code: code.trim() }).unwrap().catch(() => null);
  });

  return (
    <AuthShell
      title="Check your email"
      subtitle={`We sent a 6-digit code to ${email}.`}
      footer={
        <>
          <TextLink label="Send a new code" onPress={() => resend({ email })} />
          <TextLink label="Use a different email" onPress={onBack} />
        </>
      }
    >
      {resendState.isSuccess ? <Notice tone="success" message="A new code is on its way." /> : null}
      {error ? <Notice message={formatApiError(error)} /> : null}
      <FormField
        control={control}
        name="code"
        label="Verification code"
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={6}
        onSubmitEditing={() => onSubmit()}
      />
      <Button label="Verify and continue" onPress={onSubmit} loading={isLoading} />
    </AuthShell>
  );
}
