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

export function getAuthRedirect({
  pathname,
  isAuthenticated,
  onboardingStatus,
  hasCompany,
}: AuthRedirectInput) {
  const onboardingComplete = onboardingStatus === "complete" && hasCompany;

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
