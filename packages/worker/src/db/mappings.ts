import type { FieldMapping } from "@notion-framer/shared"
import type { Env } from "../env.js"
import { type FieldMappingRow, rowToFieldMapping } from "./types.js"

export async function getProjectMappings(env: Env, projectId: string): Promise<FieldMapping[]> {
    const rows = await env.DB.prepare(`SELECT * FROM field_mappings WHERE project_id = ?`)
        .bind(projectId)
        .all<FieldMappingRow>()
    return (rows.results ?? []).map(rowToFieldMapping)
}

export async function replaceFieldMappings(
    env: Env,
    projectId: string,
    mappings: FieldMapping[]
): Promise<void> {
    const statements = [
        env.DB.prepare(`DELETE FROM field_mappings WHERE project_id = ?`).bind(projectId),
    ]

    for (const m of mappings) {
        const transformJson = JSON.stringify({
            enumCaseMap: m.enumCaseMap,
            contentType: m.contentType,
        })
        statements.push(
            env.DB.prepare(
                `INSERT INTO field_mappings (
          project_id, source_property_id, source_property_name, source_property_type,
          framer_field_id, framer_field_name, framer_field_type, ignored, transform_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
            ).bind(
                projectId,
                m.notionPropertyId,
                m.notionPropertyName,
                m.notionPropertyType,
                m.framerFieldId,
                m.framerFieldName,
                m.framerFieldType,
                m.ignored ? 1 : 0,
                transformJson
            )
        )
    }

    await env.DB.batch(statements)
}
