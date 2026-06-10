import type { PropsWithChildren } from "react";

import { AppShell } from "@/components/app-shell/app-shell";

export default function OwnerLayout({ children }: PropsWithChildren) {
  return <AppShell>{children}</AppShell>;
}
