import type { Metadata } from "next";

import { ModulePlaceholder } from "@/components/placeholders/module-placeholder";
import { settingsModule } from "@/features/settings";

export const metadata: Metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return <ModulePlaceholder module={settingsModule} />;
}
