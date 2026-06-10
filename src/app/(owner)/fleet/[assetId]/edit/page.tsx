import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader } from "@/components/ui/page-header";
import { AssetForm } from "@/features/fleet/components/asset-form";
import { getFleetAsset } from "@/features/fleet/server/queries";

type EditFleetAssetPageProps = {
  params: Promise<{
    assetId: string;
  }>;
};

export const metadata: Metadata = {
  title: "Edit Fleet Asset",
};

export const dynamic = "force-dynamic";

export default async function EditFleetAssetPage({ params }: EditFleetAssetPageProps) {
  const { assetId } = await params;
  const asset = await getFleetAsset(assetId);

  if (!asset) {
    notFound();
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Fleet", href: "/fleet" },
          { label: asset.unit_number, href: `/fleet/${asset.id}` },
          { label: "Edit" },
        ]}
      />
      <PageHeader
        description="Update identifying details, current baseline meters, ownership information, and notes."
        eyebrow="Fleet assets"
        title={`Edit ${asset.unit_number}`}
      />
      <AssetForm asset={asset} cancelHref={`/fleet/${asset.id}`} mode="edit" />
    </>
  );
}
