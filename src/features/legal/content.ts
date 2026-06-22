export type LegalSection = {
  title: string;
  body: string;
  bullets?: string[] | undefined;
};

export const legalLastUpdated = "June 15, 2026";

export const legalLinks = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Support", href: "/support" },
] as const;

export const privacySections: LegalSection[] = [
  {
    title: "Scope",
    body:
      "This privacy notice describes the owner-only Maintly application being prepared for launch. It is a product and engineering baseline, not legal advice.",
  },
  {
    title: "Information owners provide",
    body:
      "Maintly stores account, company, fleet asset, maintenance, compliance, document, notification, and subscription information entered by the fleet owner.",
    bullets: [
      "Owner profile and company contact details",
      "Vehicle, trailer, and equipment records",
      "Mileage, engine-hour, maintenance, cost, compliance, and document metadata",
      "Private file paths and uploaded file metadata for fleet documents",
      "Subscription status and safe billing metadata needed to manage access",
    ],
  },
  {
    title: "How information is used",
    body:
      "The application uses owner data to provide the maintenance dashboard, reminders, compliance and document views, reports, uploads, account controls, support, and billing workflows.",
  },
  {
    title: "Data protection approach",
    body:
      "Tenant records are company-scoped in the database, protected by Supabase Auth and row-level security, and document files are stored in private buckets with server-created signed URLs.",
  },
  {
    title: "Data export and deletion requests",
    body:
      "Owners can export company data from Settings. Account and company deletion uses a request workflow so the service can verify authority, preserve required records where needed, and process deletion safely.",
  },
  {
    title: "Legal review required",
    body:
      "This draft must be reviewed and approved by qualified counsel before production launch, especially for jurisdiction-specific privacy, retention, and consumer-rights requirements.",
  },
];

export const termsSections: LegalSection[] = [
  {
    title: "Owner-only product",
    body:
      "Maintly is designed for the fleet owner to manage small-fleet maintenance records. It does not provide driver, mechanic, dispatch, routing, trip, payroll, invoicing, repair scheduling, work order, or repair-status workflows.",
  },
  {
    title: "Account responsibilities",
    body:
      "The account owner is responsible for entering accurate information, keeping login credentials secure, and reviewing maintenance, compliance, and document reminders before making operational decisions.",
  },
  {
    title: "No compliance guarantee",
    body:
      "Maintly can help organize requirements, due dates, and documents, but it does not renew, file, certify, or guarantee legal compliance for a fleet.",
  },
  {
    title: "Billing and access",
    body:
      "Subscription plans are based on active assets. Archived assets remain available and do not count toward the active-asset limit. Billing behavior must be verified in Stripe test mode before production use.",
  },
  {
    title: "Data controls",
    body:
      "The owner can request an export or deletion review from Settings. Deletion is irreversible after it is processed and may be subject to backup, billing, legal, or security retention obligations.",
  },
  {
    title: "Launch status",
    body:
      "These terms are a launch-readiness draft and must be reviewed by qualified counsel before the application is offered to production customers.",
  },
];
