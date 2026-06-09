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

export function verifyDashboardFramerCredentials(input: {
    framerProjectUrl: string
    framerApiKey: string
}): Promise<{ ok: true }> {
    return apiRequest<{ ok: true }>("/api/dashboard/framer/verify", {
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
