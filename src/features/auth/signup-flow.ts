export const emailConfirmationRequiredMessage =
  "Check your email to confirm your account. After confirmation, sign in to finish setting up your workspace.";

export const emailConfirmedMessage =
  "Email confirmed. Sign in to finish setting up your workspace.";

type SignupSessionResult = {
  session: unknown | null;
};

export function getSignupCompletion({ session }: SignupSessionResult) {
  return session
    ? {
        requiresEmailConfirmation: false as const,
        message: null,
      }
    : {
        requiresEmailConfirmation: true as const,
        message: emailConfirmationRequiredMessage,
      };
}

export function buildEmailConfirmationRedirect(
  appUrl: string,
  onboardingPath: string,
) {
  const baseUrl = appUrl.replace(/\/+$/, "");

  return `${baseUrl}/login?confirmed=1&redirectTo=${encodeURIComponent(onboardingPath)}`;
}
