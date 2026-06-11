# Storage Security

FleetReady uses private Supabase Storage buckets and treats PostgreSQL metadata as the authorization boundary for downloads.

## Buckets

- `asset-images`
- `maintenance-attachments`
- `compliance-documents`
- `fleet-documents`

All buckets are private. Browser code never receives a service-role key.

## Upload Rules

Document uploads support PDF, JPEG, and PNG. HEIC is deferred because the current platform does not reliably process or preview it.

Server actions validate:

- Declared MIME type
- Detected file signature
- Configured size limit through `DOCUMENT_UPLOAD_MAX_SIZE_BYTES`
- Owner-company relationship for selected assets, maintenance records, and compliance records
- Company-scoped storage paths
- Sanitized filenames

## Paths

Paths begin with the owner company UUID:

```text
{company_id}/compliance/{compliance_record_id}/{uuid}-{filename}
{company_id}/maintenance/{maintenance_record_id}/{uuid}-{filename}
{company_id}/{category}/{document_id}/{uuid}-{filename}
```

## Signed URLs

The app creates signed URLs only after a server-side query verifies the document metadata belongs to the authenticated owner company. Signed URLs are short lived and are not generated directly from user-submitted paths.

## Failure Behavior

- If file upload fails, no metadata is created.
- If file upload succeeds but metadata creation fails, the uploaded object is removed.
- For file replacement, the new file is uploaded first. If metadata update fails, the new object is removed. If metadata update succeeds, the old object is removed.
