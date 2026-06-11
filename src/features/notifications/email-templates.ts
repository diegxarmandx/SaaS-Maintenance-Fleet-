import type { ReminderNotificationCandidate } from "@/features/notifications/types";

export type WeeklyFleetSummaryEmailInput = {
  companyName: string;
  dashboardUrl: string;
  counts: {
    overdueMaintenance: number;
    maintenanceDueSoon: number;
    expiredCompliance: number;
    missingCompliance: number;
    documentsExpiringSoon: number;
    expiredDocuments: number;
  };
};

export function buildReminderEmail(
  candidate: Omit<
    ReminderNotificationCandidate,
    "emailSubject" | "emailText" | "emailHtml"
  >,
  appUrl: string,
) {
  const url = new URL(candidate.href, appUrl).toString();
  const subject = candidate.title;
  const text = `${candidate.message}\n\nOpen FleetReady: ${url}`;
  const html = [
    '<div style="font-family:Arial,sans-serif;line-height:1.5;color:#17211b">',
    `<h1 style="font-size:18px;margin:0 0 12px">${escapeHtml(candidate.title)}</h1>`,
    `<p>${escapeHtml(candidate.message)}</p>`,
    `<p><a href="${url}" style="color:#17633a;font-weight:600">Open FleetReady</a></p>`,
    '<p style="color:#64736b;font-size:12px">FleetReady tracks information entered by the owner and does not submit, renew, or guarantee legal compliance.</p>',
    "</div>",
  ].join("");

  return { subject, text, html };
}

export function buildWeeklyFleetSummaryEmail({
  companyName,
  dashboardUrl,
  counts,
}: WeeklyFleetSummaryEmailInput) {
  const subject = `Weekly FleetReady summary for ${companyName}`;
  const text = [
    `Weekly FleetReady summary for ${companyName}`,
    "",
    `Overdue maintenance: ${counts.overdueMaintenance}`,
    `Maintenance due soon: ${counts.maintenanceDueSoon}`,
    `Expired compliance: ${counts.expiredCompliance}`,
    `Missing compliance: ${counts.missingCompliance}`,
    `Documents expiring soon: ${counts.documentsExpiringSoon}`,
    `Expired documents: ${counts.expiredDocuments}`,
    "",
    `Open dashboard: ${dashboardUrl}`,
  ].join("\n");
  const html = [
    '<div style="font-family:Arial,sans-serif;line-height:1.5;color:#17211b">',
    `<h1 style="font-size:18px;margin:0 0 12px">Weekly FleetReady summary</h1>`,
    `<p>${escapeHtml(companyName)}</p>`,
    "<ul>",
    `<li>Overdue maintenance: ${counts.overdueMaintenance}</li>`,
    `<li>Maintenance due soon: ${counts.maintenanceDueSoon}</li>`,
    `<li>Expired compliance: ${counts.expiredCompliance}</li>`,
    `<li>Missing compliance: ${counts.missingCompliance}</li>`,
    `<li>Documents expiring soon: ${counts.documentsExpiringSoon}</li>`,
    `<li>Expired documents: ${counts.expiredDocuments}</li>`,
    "</ul>",
    `<p><a href="${dashboardUrl}" style="color:#17633a;font-weight:600">Open dashboard</a></p>`,
    "</div>",
  ].join("");

  return { subject, text, html };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
