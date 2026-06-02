import type { FieldMapping, ProjectStatus } from "@notion-framer/shared"

export interface ProjectRow {
    id: string
    framer_project_url: string
    framer_collection_id: string
    framer_collection_name: string | null
    notion_data_source_id: string
    notion_database_id: string | null
    notion_data_source_title: string | null
    slug_notion_property_id: string
    auto_sync: number
    auto_publish: number
    publish_mode: string
    license_key_hash: string | null
    license_status: string
}

export interface FieldMappingRow {
    notion_property_id: string
    notion_property_name: string
    notion_property_type: string
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
    notion_webhook_verification_token: string | null
}

export function projectRowToStatus(row: ProjectStatusRow): ProjectStatus {
    return {
        id: row.id,
        framerProjectUrl: row.framer_project_url,
        framerCollectionName: row.framer_collection_name ?? row.notion_data_source_title,
        notionDataSourceTitle: row.notion_data_source_title,
        notionDataSourceId: row.notion_data_source_id,
        autoSync: row.auto_sync === 1,
        autoPublish: row.auto_publish === 1,
        publishMode: row.publish_mode as ProjectStatus["publishMode"],
        licenseStatus: row.license_status,
        lastSyncAt: row.last_sync_at ?? null,
        lastError: row.last_error ?? null,
        lastErrorCode: row.last_error_code ?? null,
        itemsSyncedCount: row.items_synced_count ?? 0,
        webhookStatus: row.webhook_status ?? null,
        webhookVerificationToken: row.notion_webhook_verification_token ?? null,
    }
}

export function rowToFieldMapping(row: FieldMappingRow): FieldMapping {
    const transform = row.transform_json ? (JSON.parse(row.transform_json) as Record<string, unknown>) : {}
    return {
        notionPropertyId: row.notion_property_id,
        notionPropertyName: row.notion_property_name || row.notion_property_id,
        notionPropertyType: row.notion_property_type,
        framerFieldId: row.framer_field_id,
        framerFieldName: row.framer_field_name,
        framerFieldType: row.framer_field_type as FieldMapping["framerFieldType"],
        ignored: row.ignored === 1,
        enumCaseMap: transform.enumCaseMap as FieldMapping["enumCaseMap"],
        contentType: transform.contentType as FieldMapping["contentType"],
    }
}
