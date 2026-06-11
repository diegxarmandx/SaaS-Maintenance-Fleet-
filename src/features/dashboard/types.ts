import type { AssetAttentionStatus } from "@/features/fleet/types";

export type DashboardSummary = {
  totalActiveAssets: number;
  maintenanceDueSoon: number;
  overdueMaintenance: number;
  documentsExpiringSoon: number;
  expiredDocuments: number;
  missingComplianceItems: number;
};

export type DashboardAttentionItem = {
  id: string;
  priority: number;
  assetLabel: string;
  title: string;
  description: string;
  dueValue: string;
  href: string;
  status: AssetAttentionStatus;
};

export type DashboardRecentActivity = {
  id: string;
  label: string;
  detail: string;
  occurredAt: string;
  href: string;
};

export type DashboardFleetAssetStatus = {
  id: string;
  unitNumber: string;
  assetName: string;
  status: AssetAttentionStatus;
  reasons: string[];
  href: string;
};

export type DashboardData = {
  isConfigured: boolean;
  companyName: string;
  summary: DashboardSummary;
  attentionItems: DashboardAttentionItem[];
  recentMaintenance: DashboardRecentActivity[];
  recentDocuments: DashboardRecentActivity[];
  recentCompliance: DashboardRecentActivity[];
  recentMeterReadings: DashboardRecentActivity[];
  fleetStatus: DashboardFleetAssetStatus[];
};
