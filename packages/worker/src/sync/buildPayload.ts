import {
    SyncBoundaryError,
    buildSheetSyncPayload,
    buildSyncPayload,
    fetchSheetValues,
    GoogleSheetsApiError,
    listSheetTabs,
    queryDataSourcePages,
    syncRowMaxForPlan,
} from "@knotcms/shared"
import { getCustomerById } from "../db/customers.js"
import { getProject, getProjectMappings, getProjectSecrets, isProjectEntitled } from "../db.js"
import type { Env } from "../env.js"
import { effectivePlanId } from "../lib/entitlements.js"
import { resolveGoogleAccessToken } from "../lib/google-token.js"
import { updateProjectSourceToken } from "../db/projects.js"

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

    if (project.source_provider === "google_sheets") {
        return buildGoogleSheetsPayload(env, project, secrets.sourceToken, mappings, rowMax, projectId)
    }

    let rowCapWarning: string | undefined
    if (rowMax !== null) {
        const pages = await queryDataSourcePages(secrets.notionToken, project.source_data_source_id)
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

async function buildGoogleSheetsPayload(
    env: Env,
    project: NonNullable<Awaited<ReturnType<typeof getProject>>>,
    rawToken: string,
    mappings: Awaited<ReturnType<typeof getProjectMappings>>,
    rowMax: number | null,
    projectId: string
) {
    let rowCapWarning: string | undefined
    try {
        const { accessToken, updatedToken } = await resolveGoogleAccessToken(env, rawToken)
        if (updatedToken) {
            await updateProjectSourceToken(env, projectId, updatedToken)
        }

        const sheetId = Number.parseInt(project.source_database_id ?? "", 10)
        const tabs = await listSheetTabs(accessToken, project.source_data_source_id)
        const tab = tabs.find(t => t.sheetId === sheetId) ?? tabs[0]
        if (!tab) {
            throw new SyncBoundaryError("SHEETS_API", "Spreadsheet tab not found.")
        }

        const rows = await fetchSheetValues(accessToken, project.source_data_source_id, tab.title)
        const dataRowCount = Math.max(0, rows.length - 1)
        if (rowMax !== null && dataRowCount > rowMax) {
            rowCapWarning = `Basic plan syncs up to ${rowMax} rows per sync (${dataRowCount} in sheet). Subscribe for unlimited rows.`
        }

        const payload = buildSheetSyncPayload(
            rows,
            mappings,
            project.slug_source_property_id,
            rowMax
        )

        return { project, payload, mappings, rowCapWarning }
    } catch (error) {
        if (error instanceof GoogleSheetsApiError) {
            throw new SyncBoundaryError("SHEETS_API", error.message, { body: error.body })
        }
        throw error
    }
}
