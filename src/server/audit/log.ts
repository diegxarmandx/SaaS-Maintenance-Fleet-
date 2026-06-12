import type { OwnerDatabaseContext } from "@/features/fleet/server/owner";

export type AuditEventInput = {
  eventType: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
};

export async function recordAuditEvent(
  context: OwnerDatabaseContext,
  input: AuditEventInput,
) {
  const { error } = await context.supabase.from("audit_events").insert({
    company_id: context.companyId,
    actor_user_id: context.ownerId,
    event_type: input.eventType,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    metadata: input.metadata ?? {},
  });

  if (error) {
    console.warn("Audit event was not recorded", {
      eventType: input.eventType,
      entityType: input.entityType,
    });
  }
}
