import type { Metadata } from "next";

import { FleetListPage } from "@/features/fleet/components/fleet-list-page";
import { listFleetAssets, type FleetSearchParams } from "@/features/fleet/server/queries";

export const metadata: Metadata = {
  title: "Fleet Assets",
};

export const dynamic = "force-dynamic";

type FleetPageProps = {
  searchParams: Promise<FleetSearchParams>;
};

export default async function FleetPage({ searchParams }: FleetPageProps) {
  const result = await listFleetAssets(await searchParams);

  return <FleetListPage result={result} />;
}
