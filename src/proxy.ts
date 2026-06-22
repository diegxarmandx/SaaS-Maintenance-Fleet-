import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { getAuthRedirect, type OnboardingStatus } from "@/features/auth/redirects";

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let onboardingStatus: OnboardingStatus = null;
  let hasCompany = false;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id,onboarding_status")
      .eq("id", user.id)
      .maybeSingle();

    onboardingStatus = profile?.onboarding_status ?? "incomplete";
    hasCompany = Boolean(profile?.company_id);
  }

  const redirectTo = getAuthRedirect({
    pathname: request.nextUrl.pathname,
    isAuthenticated: Boolean(user),
    onboardingStatus,
    hasCompany,
  });

  if (!redirectTo) {
    return response;
  }

  return NextResponse.redirect(new URL(redirectTo, request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
