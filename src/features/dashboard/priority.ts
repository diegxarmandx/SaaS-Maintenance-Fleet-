export function getDashboardAttentionRank(status: string) {
  if (status === "Overdue" || status === "Expired") return 0;
  if (status === "Missing") return 1;
  if (status === "Due soon" || status === "Expiring soon") return 2;

  return 3;
}
