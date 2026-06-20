import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader } from "@/components/ui/page-header";
import { InboxPage } from "@/features/inbox/components/inbox-page";
import { getInboxOverview } from "@/features/inbox/server/queries";

export const metadata: Metadata = {
  title: "FleetReady Inbox",
};

export const dynamic = "force-dynamic";

export default async function OwnerInboxPage() {
  const inbox = await getInboxOverview();

  return (
    <>
      <Breadcrumbs
        items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Inbox" }]}
      />
      <PageHeader
        description="Upload maintenance invoices, receipts, or photos and review AI-prepared drafts before saving them to fleet history."
        eyebrow="FleetReady Inbox"
        title="Inbox"
      />
      <InboxPage inbox={inbox} />
    </>
  );
}
