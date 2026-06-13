import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CreditCard } from "lucide-react";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { AssetForm } from "@/features/fleet/components/asset-form";
import { getCurrentFleetSubscriptionSummary } from "@/features/fleet/server/queries";

export const metadata: Metadata = {
  title: "Add Fleet Asset",
};

export const dynamic = "force-dynamic";

export default async function NewFleetAssetPage() {
  const subscription = await getCurrentFleetSubscriptionSummary();

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
      {subscription && !subscription.canCreateActiveAsset ? (
        <EmptyState
          action={
            <Link
              className={buttonClassName({ variant: "secondary" })}
              href="/settings#subscription"
            >
              <CreditCard aria-hidden="true" className="h-4 w-4" />
              Review subscription
            </Link>
          }
          description={
            subscription.reason ??
            "Your current plan does not allow another active asset."
          }
          icon={<AlertTriangle aria-hidden="true" className="h-5 w-5" />}
          title="Active asset limit reached"
        />
      ) : (
        <AssetForm cancelHref="/fleet" mode="create" />
      )}
    </>
  );
}
