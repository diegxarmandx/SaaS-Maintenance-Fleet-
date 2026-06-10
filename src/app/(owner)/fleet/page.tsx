import type { Metadata } from "next";

import { ModulePlaceholder } from "@/components/placeholders/module-placeholder";
import { fleetModule } from "@/features/fleet";

export const metadata: Metadata = {
  title: "Fleet Assets",
};

export default function FleetPage() {
  return <ModulePlaceholder module={fleetModule} />;
}
