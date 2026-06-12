import {
    SyncBoundaryError,
    buildSyncPayload,
    queryDataSourcePages,
    syncRowMaxForPlan,
} from "@knotcms/shared"
import { getCustomerById } from "../db/customers.js"
import { getProject, getProjectMappings, getProjectSecrets, isProjectEntitled } from "../db.js"
import type { Env } from "../env.js"
import { effectivePlanId } from "../lib/entitlements.js"

export async function buildProjectSyncPayload(env: Env, projectId: string) {
    const project = await getProject(env, projectId)
    if (!project) throw new SyncBoundaryError("PROJECT_NOT_FOUND", "Project not found")

    if (!(await isProjectEntitled(env, project))) {
        throw new SyncBoundaryError("LICENSE_INACTIVE", "Subscription inactive")
    }

    const secrets = await getProjectSecrets(env, projectId)
    if (!secrets) throw new SyncBoundaryError("SECRETS_MISSING", "Project secrets not found")

    const mappings = await getProjectMappings(env, projectId)
    const customer = project.customer_id ? await getCustomerById(env, project.customer_id) : null
    const rowMax = syncRowMaxForPlan(customer ? effectivePlanId(customer) : "basic")

    let rowCapWarning: string | undefined
    if (rowMax !== null) {
        const pages = await queryDataSourcePages(
            secrets.notionToken,
            project.source_data_source_id
        )
        if (pages.length > rowMax) {
            rowCapWarning = `Basic plan syncs up to ${rowMax} rows per sync (${pages.length} in Notion). Subscribe for unlimited rows.`
        }
    }

    const payload = await buildSyncPayload(
        secrets.notionToken,
        project.source_data_source_id,
        mappings,
        project.slug_source_property_id,
        rowMax
    )

    return { project, payload, mappings, rowCapWarning }
}
