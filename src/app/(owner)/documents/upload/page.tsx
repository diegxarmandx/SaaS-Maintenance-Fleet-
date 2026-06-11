import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader } from "@/components/ui/page-header";
import { DocumentForm } from "@/features/documents/components/document-form";
import { getDocumentFormOptions } from "@/features/documents/server/queries";

export const metadata: Metadata = {
  title: "Upload Document",
};

export const dynamic = "force-dynamic";

export default async function UploadDocumentPage() {
  const options = await getDocumentFormOptions();

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Documents", href: "/documents" },
          { label: "Upload" },
        ]}
      />
      <PageHeader
        description="Upload a private fleet document and connect it to an asset, maintenance record, or compliance record."
        eyebrow="Documents"
        title="Upload document"
      />
      <DocumentForm cancelHref="/documents" mode="create" options={options} />
    </>
  );
}
