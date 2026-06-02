import type { CreateProjectInput, ProjectStatus, PublishMode, SyncResult } from "@notion-framer/shared"
import { API_BASE_URL } from "./config"

async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const method = (init?.method ?? "GET").toUpperCase()
    const headers = new Headers(init?.headers)
    // JSON Content-Type on GET triggers a CORS preflight (OPTIONS) on every poll — avoid that.
    if (method !== "GET" && method !== "HEAD" && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json")
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        headers,
    })

    if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
            error?: string | Record<string, unknown>
        }
        const errMsg =
            typeof body.error === "string"
                ? body.error
                : body.error
                  ? JSON.stringify(body.error)
                  : `Request failed: ${response.status}`
        throw new Error(errMsg)
    }

    return response.json() as Promise<T>
}

export async function createSetupSession(): Promise<{ setupSessionId: string; oauthUrl: string }> {
    return request("/api/setup-sessions", { method: "POST" })
}

export async function fetchDataSources(
    setupSessionId: string
): Promise<Array<{ id: string; title: string }>> {
    const data = await request<{ dataSources: Array<{ id: string; title: string }> }>(
        `/api/setup-sessions/${setupSessionId}/data-sources`
    )
    return data.dataSources
}

export async function fetchDataSourceProperties(
    setupSessionId: string,
    dataSourceId: string
): Promise<Array<{ id: string; name: string; type: string }>> {
    const data = await request<{ properties: Array<{ id: string; name: string; type: string }> }>(
        `/api/setup-sessions/${setupSessionId}/data-sources/${dataSourceId}/properties`
    )
    return data.properties
}

export async function verifyLicense(licenseKey: string, framerProjectUrl: string) {
    return request<{ valid: boolean; reason?: string }>("/api/license/verify", {
        method: "POST",
        body: JSON.stringify({ licenseKey, framerProjectUrl }),
    })
}

export async function createProject(
    input: CreateProjectInput
): Promise<{ projectId: string; sync: import("@notion-framer/shared").SyncResult | null }> {
    return request("/api/projects", {
        method: "POST",
        body: JSON.stringify(input),
    })
}

export async function getProjectStatus(projectId: string): Promise<ProjectStatus> {
    return request(`/api/projects/${projectId}`)
}

export async function triggerSync(projectId: string): Promise<SyncResult> {
    return request(`/api/projects/${projectId}/sync`, { method: "POST" })
}

export async function updatePublishSettings(
    projectId: string,
    settings: { autoPublish: boolean; publishMode?: PublishMode }
): Promise<ProjectStatus> {
    return request(`/api/projects/${projectId}/publish`, {
        method: "PATCH",
        body: JSON.stringify(settings),
    })
}
