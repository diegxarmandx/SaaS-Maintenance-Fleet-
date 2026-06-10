"use server";

import { redirect } from "next/navigation";

import {
  loginFormSchema,
  passwordResetRequestSchema,
  signupFormSchema,
  type LoginFormValues,
  type PasswordResetRequestValues,
  type SignupFormValues,
} from "@/features/auth/validation/auth";
import { serverEnv } from "@/lib/env/server";
import { getErrorMessage } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthActionResult = {
  status: "error" | "success";
  message: string;
};

export async function signInAction(values: LoginFormValues): Promise<AuthActionResult> {
  const parsed = loginFormSchema.safeParse(values);

  if (!parsed.success) {
    return { status: "error", message: "Enter a valid email and password." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);

    if (error) {
      return { status: "error", message: error.message };
    }
  } catch (error) {
    return { status: "error", message: getErrorMessage(error) };
  }

  redirect("/dashboard");
}

export async function signUpAction(values: SignupFormValues): Promise<AuthActionResult> {
  const parsed = signupFormSchema.safeParse(values);

  if (!parsed.success) {
    return { status: "error", message: "Enter a valid owner name, email, and password." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: {
          full_name: parsed.data.ownerName,
        },
        emailRedirectTo: `${serverEnv.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/onboarding`,
      },
    });

    if (error) {
      return { status: "error", message: error.message };
    }
  } catch (error) {
    return { status: "error", message: getErrorMessage(error) };
  }

  redirect("/onboarding");
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordResetAction(
  values: PasswordResetRequestValues,
): Promise<AuthActionResult> {
  const parsed = passwordResetRequestSchema.safeParse(values);

  if (!parsed.success) {
    return { status: "error", message: "Enter a valid email address." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${serverEnv.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/reset-password`,
    });

    if (error) {
      return { status: "error", message: error.message };
    }

    return {
      status: "success",
      message: "If the account exists, a password reset link has been sent.",
    };
  } catch (error) {
    return { status: "error", message: getErrorMessage(error) };
  }
}
