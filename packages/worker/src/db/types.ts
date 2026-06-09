import type { FieldMapping, ProjectStatus } from "@notion-framer/shared"

export interface ProjectRow {
    id: string
    customer_id: string | null
    framer_project_url: string
    framer_collection_id: string
    framer_collection_name: string | null
    source_provider: string
    source_data_source_id: string
    source_database_id: string | null
    source_title: string | null
    slug_source_property_id: string
    auto_sync: number
    auto_publish: number
    publish_mode: string
}

export interface FieldMappingRow {
    source_property_id: string
    source_property_name: string
    source_property_type: string
    framer_field_id: string
    framer_field_name: string
    framer_field_type: string
    ignored: number
    transform_json: string | null
}

export interface ProjectStatusRow extends ProjectRow {
    last_sync_at: string | null
    last_error: string | null
    last_error_code: string | null
    items_synced_count: number | null
    webhook_status: string | null
    source_webhook_verification_token: string | null
    integration_webhook_verification_token: string | null
    customer_subscription_status: string | null
}

export function projectRowToStatus(row: ProjectStatusRow): ProjectStatus {
    const entitled =
        !row.customer_id ||
        row.customer_subscription_status === "active" ||
        row.customer_subscription_status === null

    return {
        id: row.id,
        framerProjectUrl: row.framer_project_url,
        framerCollectionName: row.framer_collection_name ?? row.source_title,
        notionDataSourceTitle: row.source_title,
        notionDataSourceId: row.source_data_source_id,
        autoSync: row.auto_sync === 1,
        autoPublish: row.auto_publish === 1,
        publishMode: row.publish_mode as ProjectStatus["publishMode"],
        licenseStatus: entitled ? "active" : "inactive",
        lastSyncAt: row.last_sync_at ?? null,
        lastError: row.last_error ?? null,
        lastErrorCode: row.last_error_code ?? null,
        itemsSyncedCount: row.items_synced_count ?? 0,
        webhookStatus: row.webhook_status ?? null,
        webhookVerificationToken:
            row.webhook_status === "active"
                ? null
                : (row.source_webhook_verification_token ??
                  row.integration_webhook_verification_token ??
                  null),
    }
}

export function rowToFieldMapping(row: FieldMappingRow): FieldMapping {
    const transform = row.transform_json ? (JSON.parse(row.transform_json) as Record<string, unknown>) : {}
    return {
        notionPropertyId: row.source_property_id,
        notionPropertyName: row.source_property_name || row.source_property_id,
        notionPropertyType: row.source_property_type,
        framerFieldId: row.framer_field_id,
        framerFieldName: row.framer_field_name,
        framerFieldType: row.framer_field_type as FieldMapping["framerFieldType"],
        ignored: row.ignored === 1,
        enumCaseMap: transform.enumCaseMap as FieldMapping["enumCaseMap"],
        contentType: transform.contentType as FieldMapping["contentType"],
    }
}
