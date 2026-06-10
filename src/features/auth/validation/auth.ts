import { z } from "zod";

export const emailSchema = z.string().trim().email();

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(128, "Use fewer than 128 characters.");

export const loginFormSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const signupFormSchema = z.object({
  ownerName: z.string().trim().min(2, "Enter the owner's name."),
  email: emailSchema,
  password: passwordSchema,
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;
export type SignupFormValues = z.infer<typeof signupFormSchema>;
