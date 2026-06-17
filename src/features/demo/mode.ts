import { isSupabasePublicConfigReady } from "@/lib/env/public";
import { serverEnv } from "@/lib/env/server";

const isEnabledFlag = (value: string | undefined) => value === "1" || value === "true";

export const isLocalDemoModeEnabled =
  serverEnv.NODE_ENV !== "production" &&
  (isEnabledFlag(serverEnv.ENABLE_LOCAL_DEMO) ||
    isEnabledFlag(serverEnv.FLEETREADY_PLAYWRIGHT));

export const shouldUseLocalDemoData =
  isLocalDemoModeEnabled && !isSupabasePublicConfigReady;
