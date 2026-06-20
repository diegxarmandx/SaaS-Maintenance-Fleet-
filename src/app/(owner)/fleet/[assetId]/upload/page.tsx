import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader } from "@/components/ui/page-header";
import { getFleetAsset } from "@/features/fleet/server/queries";
import { InboxUploadForm } from "@/features/inbox/components/inbox-upload-form";

export const metadata: Metadata = {
  title: "Upload Asset Paperwork",
};

export const dynamic = "force-dynamic";

export default async function AssetInboxUploadPage({
  params,
}: {
  params: Promise<{ assetId: string }>;
}) {
  const { assetId } = await params;
  const asset = await getFleetAsset(assetId);
  if (!asset) {
    notFound();
  }

  const assetLabel = `${asset.unit_number} ${asset.asset_name}`;
  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Fleet", href: "/fleet" },
          { label: asset.unit_number, href: `/fleet/${asset.id}` },
          { label: "Inbox", href: `/fleet/${asset.id}?section=inbox` },
          { label: "Upload" },
        ]}
      />
      <PageHeader
        description="Take a photo or upload a private fleet document for this asset."
        eyebrow="Asset Inbox"
        title={`Upload paperwork for ${asset.unit_number}`}
      />
      <InboxUploadForm assetId={asset.id} assetLabel={assetLabel} />
    </>
  );
}
