import type { Metadata } from "next";

import { DocumentLibraryPage } from "@/features/documents/components/document-library-page";
import {
  getDocumentLibrary,
  type DocumentSearchParams,
} from "@/features/documents/server/queries";

export const metadata: Metadata = {
  title: "Documents",
};

export const dynamic = "force-dynamic";

type DocumentsPageProps = {
  searchParams: Promise<DocumentSearchParams>;
};

export default async function DocumentsPage({ searchParams }: DocumentsPageProps) {
  const library = await getDocumentLibrary(await searchParams);

  return <DocumentLibraryPage library={library} />;
}
