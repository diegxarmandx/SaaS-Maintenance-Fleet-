import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader } from "@/components/ui/page-header";
import { getFleetAsset } from "@/features/fleet/server/queries";
import { InboxReviewPage } from "@/features/inbox/components/inbox-review-page";
import { getAssetInboxJobDetail } from "@/features/inbox/server/queries";
import { getMaintenanceFormOptions } from "@/features/maintenance/server/queries";

export const metadata: Metadata = {
  title: "Review Asset Inbox Item",
};

export const dynamic = "force-dynamic";

export default async function AssetInboxReviewPage({
  params,
}: {
  params: Promise<{ assetId: string; jobId: string }>;
}) {
  const { assetId, jobId } = await params;
  const [asset, detail, options] = await Promise.all([
    getFleetAsset(assetId),
    getAssetInboxJobDetail(assetId, jobId),
    getMaintenanceFormOptions(),
  ]);

  if (!asset || !detail.job) {
    notFound();
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Fleet", href: "/fleet" },
          { label: asset.unit_number, href: `/fleet/${asset.id}` },
          { label: "Inbox", href: `/fleet/${asset.id}?section=inbox` },
          { label: "Review" },
        ]}
      />
      <PageHeader
        description="Correct extracted details, then save the paperwork to this asset's history."
        eyebrow="Asset Inbox"
        title="Review paperwork"
      />
      <InboxReviewPage assetId={asset.id} detail={detail} options={options} />
    </>
  );
}
