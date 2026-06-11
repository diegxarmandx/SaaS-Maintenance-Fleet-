export type NotificationSyncPlan = {
  insertKeys: string[];
  updateKeys: string[];
  resolveKeys: string[];
};

export function planNotificationSync({
  activeKeys,
  candidateKeys,
}: {
  activeKeys: string[];
  candidateKeys: string[];
}): NotificationSyncPlan {
  const active = new Set(activeKeys);
  const candidates = new Set(candidateKeys);

  return {
    insertKeys: candidateKeys.filter((key) => !active.has(key)),
    updateKeys: candidateKeys.filter((key) => active.has(key)),
    resolveKeys: activeKeys.filter((key) => !candidates.has(key)),
  };
}
