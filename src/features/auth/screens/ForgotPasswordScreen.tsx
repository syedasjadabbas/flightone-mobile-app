import { router } from "expo-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Notice } from "@/core/components";
import { formatApiError } from "@/core/api/formatApiError";
import { AuthShell } from "../components/AuthShell";
import { FormField } from "../components/FormField";
import { TextLink } from "../components/TextLink";
import { useForgotPasswordMutation } from "../api/authApi";
import { forgotPasswordSchema, type ForgotPasswordValues } from "../schemas";

export function ForgotPasswordScreen() {
  const [send, { isLoading, error, data }] = useForgotPasswordMutation();
  const { control, handleSubmit, getValues } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    await send({ email: email.trim() }).unwrap().catch(() => null);
  });

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your account email and we'll send you a reset link."
      footer={<TextLink label="Back to sign in" onPress={() => router.replace("/login")} />}
    >
      {error ? <Notice message={formatApiError(error)} /> : null}
      {data ? (
        <>
          <Notice tone={data.emailDelivery === "UNCONFIGURED" ? "info" : "success"} message={data.message} />
          <Button
            label="I have a reset code"
            variant="ghost"
            onPress={() => router.push({ pathname: "/reset-password", params: { email: getValues("email").trim() } })}
          />
        </>
      ) : (
        <>
          <FormField
            control={control}
            name="email"
            label="Email"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            onSubmitEditing={() => onSubmit()}
          />
          <Button label="Send reset link" onPress={onSubmit} loading={isLoading} />
        </>
      )}
    </AuthShell>
  );
}
