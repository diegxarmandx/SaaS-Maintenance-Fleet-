import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader } from "@/components/ui/page-header";
import { AssetForm } from "@/features/fleet/components/asset-form";

export const metadata: Metadata = {
  title: "Add Fleet Asset",
};

export const dynamic = "force-dynamic";

export default function NewFleetAssetPage() {
  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Fleet", href: "/fleet" },
          { label: "Add asset" },
        ]}
      />
      <PageHeader
        description="Create a fleet record for a vehicle, trailer, or piece of equipment you own."
        eyebrow="Fleet assets"
        title="Add asset"
      />
      <AssetForm cancelHref="/fleet" mode="create" />
    </>
  );
}
