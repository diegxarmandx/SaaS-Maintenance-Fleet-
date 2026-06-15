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
import {
  genericPasswordResetMessage,
  genericSignInErrorMessage,
  genericSignUpErrorMessage,
} from "@/features/auth/messages";
import { getPostLoginRedirect } from "@/features/auth/redirects";
import { serverEnv } from "@/lib/env/server";
import {
  checkAuthRateLimit,
  rateLimitedMessage,
} from "@/lib/rate-limit/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthActionResult = {
  status: "error" | "success";
  message: string;
};

export async function signInAction(
  values: LoginFormValues,
  redirectTo?: string | null,
): Promise<AuthActionResult> {
  const parsed = loginFormSchema.safeParse(values);

  if (!parsed.success) {
    return { status: "error", message: "Enter a valid email and password." };
  }

  const rateLimit = await checkAuthRateLimit("login", parsed.data.email);

  if (!rateLimit.success) {
    return { status: "error", message: rateLimitedMessage };
  }

  let destination = "/dashboard";

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);

    if (error) {
      return { status: "error", message: genericSignInErrorMessage };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        status: "error",
        message: "Authentication could not be completed. Please try signing in again.",
      };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id,onboarding_status")
      .eq("id", user.id)
      .maybeSingle();

    destination = getPostLoginRedirect({
      onboardingStatus: profile?.onboarding_status ?? "incomplete",
      hasCompany: Boolean(profile?.company_id),
      redirectTo,
    });
  } catch {
    return { status: "error", message: genericSignInErrorMessage };
  }

  redirect(destination);
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
      return { status: "error", message: genericSignUpErrorMessage };
    }
  } catch {
    return { status: "error", message: genericSignUpErrorMessage };
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

  const rateLimit = await checkAuthRateLimit("passwordReset", parsed.data.email);

  if (!rateLimit.success) {
    return { status: "error", message: rateLimitedMessage };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${serverEnv.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/reset-password`,
    });

    if (error) {
      return { status: "success", message: genericPasswordResetMessage };
    }

    return { status: "success", message: genericPasswordResetMessage };
  } catch {
    return { status: "success", message: genericPasswordResetMessage };
  }
}
