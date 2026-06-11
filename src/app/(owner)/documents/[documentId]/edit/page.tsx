import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader } from "@/components/ui/page-header";
import { DocumentForm } from "@/features/documents/components/document-form";
import {
  getDocumentDetail,
  getDocumentFormOptions,
} from "@/features/documents/server/queries";

type EditDocumentPageProps = {
  params: Promise<{
    documentId: string;
  }>;
};

export const metadata: Metadata = {
  title: "Edit Document",
};

export const dynamic = "force-dynamic";

export default async function EditDocumentPage({ params }: EditDocumentPageProps) {
  const { documentId } = await params;
  const [document, options] = await Promise.all([
    getDocumentDetail(documentId),
    getDocumentFormOptions(),
  ]);

  if (!document) {
    notFound();
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Documents", href: "/documents" },
          { label: document.document_name, href: `/documents/${document.id}` },
          { label: "Edit" },
        ]}
      />
      <PageHeader
        description="Update document metadata or replace the private file while keeping the document record."
        eyebrow="Documents"
        title="Edit document"
      />
      <DocumentForm
        cancelHref={`/documents/${document.id}`}
        document={document}
        mode="edit"
        options={options}
      />
    </>
  );
}
