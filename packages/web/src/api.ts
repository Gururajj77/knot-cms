import type {
    CreateProjectResponse,
    DashboardCreateProjectInput,
    ProjectStatus,
    PublishMode,
    SyncResult,
} from "@notion-framer/shared"

export interface AuthMe {
    authenticated: boolean
    email?: string
    customerId?: string | null
    entitled?: boolean
    checkoutUrl?: string | null
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const method = (init?.method ?? "GET").toUpperCase()
    const headers = new Headers(init?.headers)
    if (method !== "GET" && method !== "HEAD" && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json")
    }

    const response = await fetch(path, {
        ...init,
        headers,
        credentials: "include",
    })

    if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
            error?: string | Record<string, unknown>
            checkoutUrl?: string | null
        }
        const message =
            typeof body.error === "string"
                ? body.error
                : body.error
                  ? JSON.stringify(body.error)
                  : `Request failed (${response.status})`
        const err = new Error(message) as Error & { checkoutUrl?: string | null; status?: number }
        err.checkoutUrl = body.checkoutUrl
        err.status = response.status
        throw err
    }

    return response.json() as Promise<T>
}

export function fetchAuthMe(): Promise<AuthMe> {
    return request<AuthMe>("/api/auth/me")
}

export function createDashboardSetupSession(): Promise<{
    setupSessionId: string
    oauthUrl: string
    credentialWarning?: string | null
}> {
    return request("/api/dashboard/setup-sessions", { method: "POST" })
}

export function fetchDashboardDataSources(
    setupSessionId: string
): Promise<Array<{ id: string; title: string; databaseId?: string }>> {
    return request(`/api/dashboard/setup-sessions/${setupSessionId}/data-sources`).then(
        r => (r as { dataSources: Array<{ id: string; title: string; databaseId?: string }> }).dataSources
    )
}

export function fetchDashboardDataSourceProperties(
    setupSessionId: string,
    dataSourceId: string
): Promise<Array<{ id: string; name: string; type: string }>> {
    return request(
        `/api/dashboard/setup-sessions/${setupSessionId}/data-sources/${dataSourceId}/properties`
    ).then(r => (r as { properties: Array<{ id: string; name: string; type: string }> }).properties)
}

export function fetchDashboardProjects(): Promise<ProjectStatus[]> {
    return request<{ projects: ProjectStatus[] }>("/api/dashboard/projects").then(r => r.projects)
}

export function createDashboardProject(input: DashboardCreateProjectInput): Promise<CreateProjectResponse> {
    return request<CreateProjectResponse>("/api/dashboard/projects", {
        method: "POST",
        body: JSON.stringify(input),
    })
}

export function fetchDashboardProject(projectId: string): Promise<ProjectStatus> {
    return request<ProjectStatus>(`/api/dashboard/projects/${projectId}`)
}

export function triggerDashboardSync(projectId: string): Promise<SyncResult> {
    return request<SyncResult>(`/api/dashboard/projects/${projectId}/sync`, { method: "POST" })
}

export function updateDashboardPublishSettings(
    projectId: string,
    settings: { autoPublish: boolean; publishMode?: PublishMode }
): Promise<ProjectStatus> {
    return request<ProjectStatus>(`/api/dashboard/projects/${projectId}/publish`, {
        method: "PATCH",
        body: JSON.stringify(settings),
    })
}

export function logout(): Promise<void> {
    return request("/auth/google/logout", { method: "POST" }).then(() => undefined)
}
