create index if not exists maintenance_rules_template_id_idx
on public.maintenance_rules (template_id)
where template_id is not null;

create index if not exists maintenance_records_maintenance_rule_id_idx
on public.maintenance_records (maintenance_rule_id)
where maintenance_rule_id is not null;

create index if not exists documents_compliance_record_id_idx
on public.documents (compliance_record_id)
where compliance_record_id is not null;

create index if not exists documents_maintenance_record_id_idx
on public.documents (maintenance_record_id)
where maintenance_record_id is not null;

create index if not exists report_preferences_default_asset_id_idx
on public.report_preferences (default_asset_id)
where default_asset_id is not null;

create index if not exists document_versions_created_by_idx
on public.document_versions (created_by)
where created_by is not null;

create index if not exists audit_events_actor_user_id_idx
on public.audit_events (actor_user_id)
where actor_user_id is not null;
