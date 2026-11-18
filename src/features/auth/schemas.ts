import { z } from "zod";

/** Same rules as `server/modules/auth/auth.validators.js`. */
const email = z.string().trim().min(1, "Enter your email.").email("Enter a valid email address.");
const newPassword = z.string().min(8, "Use at least 8 characters.");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
});

export const signupSchema = z
  .object({
    name: z.string().trim().min(1, "Enter your name."),
    email,
    password: newPassword,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });

export const codeSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code."),
});

export const twoFactorSchema = z.object({
  code: z.string().trim().min(1, "Enter your code."),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(1, "Paste the reset code from your email."),
    password: newPassword,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });

export type LoginValues = z.infer<typeof loginSchema>;
export type SignupValues = z.infer<typeof signupSchema>;
export type CodeValues = z.infer<typeof codeSchema>;
export type TwoFactorValues = z.infer<typeof twoFactorSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
