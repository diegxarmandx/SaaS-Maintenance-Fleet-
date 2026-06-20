import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader } from "@/components/ui/page-header";
import { InboxUploadForm } from "@/features/inbox/components/inbox-upload-form";

export const metadata: Metadata = {
  title: "Upload to Inbox",
};

export const dynamic = "force-dynamic";

export default function NewInboxUploadPage() {
  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Inbox", href: "/inbox" },
          { label: "Upload" },
        ]}
      />
      <PageHeader
        description="FleetReady will prepare a maintenance draft from a private invoice, receipt, or photo. You stay in control before anything is saved."
        eyebrow="FleetReady Inbox"
        title="Upload maintenance receipt"
      />
      <InboxUploadForm />
    </>
  );
}
