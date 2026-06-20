import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader } from "@/components/ui/page-header";
import { InboxReviewPage } from "@/features/inbox/components/inbox-review-page";
import { getInboxJobDetail } from "@/features/inbox/server/queries";
import { getMaintenanceFormOptions } from "@/features/maintenance/server/queries";

export const metadata: Metadata = {
  title: "Review Inbox Draft",
};

export const dynamic = "force-dynamic";

type InboxJobPageProps = {
  params: Promise<{ jobId: string }>;
};

export default async function InboxJobPage({ params }: InboxJobPageProps) {
  const { jobId } = await params;
  const [detail, options] = await Promise.all([
    getInboxJobDetail(jobId),
    getMaintenanceFormOptions(),
  ]);

  if (!detail.job) {
    notFound();
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Inbox", href: "/inbox" },
          { label: "Review" },
        ]}
      />
      <PageHeader
        description="Review every suggested field before creating maintenance history or saving the file only."
        eyebrow="FleetReady Inbox"
        title="Review draft"
      />
      <InboxReviewPage detail={detail} options={options} />
    </>
  );
}
