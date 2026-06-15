export type RateLimitPolicy = {
  name: string;
  limit: number;
  windowSeconds: number;
  algorithm: "sliding-window";
  description: string;
};

export const rateLimitPolicies = {
  login: {
    name: "login",
    limit: 5,
    windowSeconds: 15 * 60,
    algorithm: "sliding-window",
    description: "Owner login attempts per normalized email and client IP.",
  },
  passwordReset: {
    name: "password-reset",
    limit: 3,
    windowSeconds: 60 * 60,
    algorithm: "sliding-window",
    description: "Password reset requests per normalized email and client IP.",
  },
  emailVerificationResend: {
    name: "email-verification-resend",
    limit: 3,
    windowSeconds: 60 * 60,
    algorithm: "sliding-window",
    description: "Email verification resend requests per authenticated owner.",
  },
  authenticatedApi: {
    name: "authenticated-api",
    limit: 120,
    windowSeconds: 60,
    algorithm: "sliding-window",
    description: "General authenticated API requests per owner.",
  },
  expensiveOperation: {
    name: "expensive-operation",
    limit: 20,
    windowSeconds: 60,
    algorithm: "sliding-window",
    description: "Dashboard and report operations per owner.",
  },
  mutation: {
    name: "mutation",
    limit: 30,
    windowSeconds: 60,
    algorithm: "sliding-window",
    description:
      "Fleet, maintenance, compliance, document, report, and settings mutations per owner.",
  },
  documentUpload: {
    name: "document-upload",
    limit: 10,
    windowSeconds: 10 * 60,
    algorithm: "sliding-window",
    description: "Document and attachment uploads per owner and fleet account.",
  },
  notificationTrigger: {
    name: "notification-trigger",
    limit: 5,
    windowSeconds: 60,
    algorithm: "sliding-window",
    description: "Email or notification trigger requests per fleet account.",
  },
  publicHealth: {
    name: "public-health",
    limit: 30,
    windowSeconds: 60,
    algorithm: "sliding-window",
    description: "Public health checks per client IP.",
  },
} as const satisfies Record<string, RateLimitPolicy>;

export type RateLimitPolicyName = keyof typeof rateLimitPolicies;

export function getRateLimitPolicy(policyName: RateLimitPolicyName): RateLimitPolicy {
  return rateLimitPolicies[policyName];
}
