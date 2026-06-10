import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AssetProfilePage } from "@/features/fleet/components/asset-profile-page";
import { getFleetAsset } from "@/features/fleet/server/queries";

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
  const asset = await getFleetAsset(assetId);

  if (!asset) {
    notFound();
  }

  return <AssetProfilePage asset={asset} />;
}
