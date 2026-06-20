import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AssetProfilePage } from "@/features/fleet/components/asset-profile-page";
import { getFleetAsset } from "@/features/fleet/server/queries";
import { getAssetComplianceSnapshot } from "@/features/compliance/server/queries";
import { getAssetDocumentSnapshot } from "@/features/documents/server/queries";
import { getAssetMaintenanceSnapshot } from "@/features/maintenance/server/queries";
import { getAssetInboxOverview } from "@/features/inbox/server/queries";
import { getAssetSection } from "@/features/inbox/asset-helpers";

type FleetAssetPageProps = {
  params: Promise<{
    assetId: string;
  }>;
  searchParams: Promise<{
    section?: string | string[];
  }>;
};

export const metadata: Metadata = {
  title: "Fleet Asset",
};

export const dynamic = "force-dynamic";

export default async function FleetAssetPage({
  params,
  searchParams,
}: FleetAssetPageProps) {
  const { assetId } = await params;
  const query = await searchParams;
  const section = getAssetSection(
    Array.isArray(query.section) ? query.section[0] : query.section,
  );
  const [
    asset,
    maintenanceSnapshot,
    complianceSnapshot,
    documentSnapshot,
    inboxSnapshot,
  ] = await Promise.all([
    getFleetAsset(assetId),
    getAssetMaintenanceSnapshot(assetId),
    getAssetComplianceSnapshot(assetId),
    getAssetDocumentSnapshot(assetId),
    getAssetInboxOverview(assetId),
  ]);

  if (!asset) {
    notFound();
  }

  return (
    <AssetProfilePage
      asset={asset}
      complianceSnapshot={complianceSnapshot}
      documentSnapshot={documentSnapshot}
      inboxSnapshot={inboxSnapshot}
      maintenanceSnapshot={maintenanceSnapshot}
      section={section}
    />
  );
}
