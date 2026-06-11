import type { FieldMapping, FramerSyncTarget } from "@knotcms/shared"
import { apiRequest } from "./client"

export interface SetupSessionResponse {
    setupSessionId: string
    oauthUrl: string
    credentialWarning?: string | null
}

export interface DataSourceSummary {
    id: string
    title: string
    databaseId?: string
}

export interface PropertySummary {
    id: string
    name: string
    type: string
}

export function createDashboardSetupSession(): Promise<SetupSessionResponse> {
    return apiRequest("/api/dashboard/setup-sessions", { method: "POST" })
}

export function fetchDashboardDataSources(setupSessionId: string): Promise<DataSourceSummary[]> {
    return apiRequest<{ dataSources: DataSourceSummary[] }>(
        `/api/dashboard/setup-sessions/${setupSessionId}/data-sources`
    ).then(r => r.dataSources)
}

export interface FramerCollectionFieldSummary {
    id: string
    name: string
    type: string
    cases?: Array<{ id: string; name: string }>
}

export interface FramerCollectionBootstrapPreview {
    eligible: boolean
    mappedFieldCount: number
    skippedFieldCount: number
    titleFieldId: string | null
    warnings: string[]
    ineligibleReason?: string
}

export interface FramerCollectionSummary {
    id: string
    name: string
    managedBy: "user" | "thisPlugin" | "anotherPlugin"
    canUseAsTemplate: boolean
    itemCount: number
    fields: FramerCollectionFieldSummary[]
    bootstrapPreview: FramerCollectionBootstrapPreview
}

export function verifyDashboardFramerCredentials(input: {
    framerProjectUrl: string
    framerApiKey: string
}): Promise<{ ok: true }> {
    return apiRequest<{ ok: true }>("/api/dashboard/framer/verify", {
        method: "POST",
        body: JSON.stringify(input),
    })
}

export function fetchDashboardFramerCollections(input: {
    framerProjectUrl: string
    framerApiKey: string
}): Promise<FramerCollectionSummary[]> {
    return apiRequest<{ collections: FramerCollectionSummary[] }>(
        "/api/dashboard/setup/framer/collections",
        {
            method: "POST",
            body: JSON.stringify(input),
        }
    ).then(r => r.collections)
}

export interface NotionPageSummary {
    id: string
    title: string
}

export interface BootstrapNotionDatabaseResult {
    databaseId: string
    dataSourceId: string
    title: string
    properties: PropertySummary[]
    fieldMappings: FieldMapping[]
    warnings: string[]
    itemsImported: number
    itemsSkipped: number
    importWarnings: string[]
    framerSyncTarget: FramerSyncTarget
}

export function searchDashboardNotionPages(
    setupSessionId: string,
    query: string
): Promise<NotionPageSummary[]> {
    return apiRequest<{ pages: NotionPageSummary[] }>("/api/dashboard/setup/notion/search-pages", {
        method: "POST",
        body: JSON.stringify({ setupSessionId, query }),
    }).then(r => r.pages)
}

export function bootstrapDashboardNotionDatabase(input: {
    setupSessionId: string
    framerProjectUrl: string
    framerApiKey: string
    framerCollectionId: string
    parentPageId: string
    databaseTitle?: string
}): Promise<BootstrapNotionDatabaseResult> {
    return apiRequest<BootstrapNotionDatabaseResult>("/api/dashboard/setup/notion/bootstrap-database", {
        method: "POST",
        body: JSON.stringify(input),
    })
}

export function fetchDashboardDataSourceProperties(
    setupSessionId: string,
    dataSourceId: string
): Promise<PropertySummary[]> {
    return apiRequest<{ properties: PropertySummary[] }>(
        `/api/dashboard/setup-sessions/${setupSessionId}/data-sources/${dataSourceId}/properties`
    ).then(r => r.properties)
}
