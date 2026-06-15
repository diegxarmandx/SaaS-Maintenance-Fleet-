export type OnboardingStatus = "incomplete" | "complete" | null;

export type AuthRedirectInput = {
  pathname: string;
  isAuthenticated: boolean;
  onboardingStatus: OnboardingStatus;
  hasCompany: boolean;
};

const authRoutes = new Set(["/login", "/signup"]);
const publicRoutes = new Set([
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
]);

export function isProtectedPath(pathname: string) {
  return !publicRoutes.has(pathname);
}

export function normalizeProtectedRedirect(redirectTo: string | null | undefined) {
  if (!redirectTo || !redirectTo.startsWith("/") || redirectTo.startsWith("//")) {
    return "/dashboard";
  }

  const pathname = redirectTo.split(/[?#]/, 1)[0] || "/";

  if (!isProtectedPath(pathname)) {
    return "/dashboard";
  }

  return redirectTo;
}

export function getPostLoginRedirect({
  onboardingStatus,
  hasCompany,
  redirectTo,
}: Pick<AuthRedirectInput, "onboardingStatus" | "hasCompany"> & {
  redirectTo?: string | null | undefined;
}) {
  const onboardingComplete = onboardingStatus === "complete" && hasCompany;

  return onboardingComplete ? normalizeProtectedRedirect(redirectTo) : "/onboarding";
}

export function getAuthRedirect({
  pathname,
  isAuthenticated,
  onboardingStatus,
  hasCompany,
}: AuthRedirectInput) {
  const onboardingComplete = onboardingStatus === "complete" && hasCompany;

  if (isAuthenticated && pathname === "/" && onboardingComplete) {
    return "/dashboard";
  }

  if (!isAuthenticated && isProtectedPath(pathname)) {
    return `/login?redirectTo=${encodeURIComponent(pathname)}`;
  }

  if (isAuthenticated && authRoutes.has(pathname)) {
    return onboardingComplete ? "/dashboard" : "/onboarding";
  }

  if (isAuthenticated && pathname !== "/onboarding" && !onboardingComplete) {
    return "/onboarding";
  }

  if (isAuthenticated && pathname === "/onboarding" && onboardingComplete) {
    return "/dashboard";
  }

  return null;
}
