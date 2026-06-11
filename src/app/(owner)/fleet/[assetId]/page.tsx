import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AssetProfilePage } from "@/features/fleet/components/asset-profile-page";
import { getFleetAsset } from "@/features/fleet/server/queries";
import { getAssetComplianceSnapshot } from "@/features/compliance/server/queries";
import { getAssetDocumentSnapshot } from "@/features/documents/server/queries";
import { getAssetMaintenanceSnapshot } from "@/features/maintenance/server/queries";

type FleetAssetPageProps = {
  params: Promise<{
    assetId: string;
  }>;
};

export const metadata: Metadata = {
  title: "Fleet Asset",
};

export const dynamic = "force-dynamic";

export default async function FleetAssetPage({ params }: FleetAssetPageProps) {
  const { assetId } = await params;
  const [asset, maintenanceSnapshot, complianceSnapshot, documentSnapshot] =
    await Promise.all([
      getFleetAsset(assetId),
      getAssetMaintenanceSnapshot(assetId),
      getAssetComplianceSnapshot(assetId),
      getAssetDocumentSnapshot(assetId),
    ]);

  if (!asset) {
    notFound();
  }

  return (
    <AssetProfilePage
      asset={asset}
      complianceSnapshot={complianceSnapshot}
      documentSnapshot={documentSnapshot}
      maintenanceSnapshot={maintenanceSnapshot}
    />
  );
}
