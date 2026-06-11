import type {
    CreateProjectResponse,
    DashboardCreateProjectInput,
    DeleteProjectResponse,
    ProjectStatus,
    PublishMode,
    SyncResult,
} from "@knotcms/shared"
import { apiRequest } from "./client"

export function fetchDashboardProjects(): Promise<ProjectStatus[]> {
    return apiRequest<{ projects: ProjectStatus[] }>("/api/dashboard/projects").then(r => r.projects)
}

export function fetchDashboardProject(projectId: string): Promise<ProjectStatus> {
    return apiRequest<ProjectStatus>(`/api/dashboard/projects/${projectId}`)
}

export function createDashboardProject(input: DashboardCreateProjectInput): Promise<CreateProjectResponse> {
    return apiRequest<CreateProjectResponse>("/api/dashboard/projects", {
        method: "POST",
        body: JSON.stringify(input),
    })
}

export function triggerDashboardSync(projectId: string): Promise<SyncResult> {
    return apiRequest<SyncResult>(`/api/dashboard/projects/${projectId}/sync`, { method: "POST" })
}

export function confirmDashboardWebhook(projectId: string): Promise<ProjectStatus> {
    return apiRequest<ProjectStatus>(`/api/dashboard/projects/${projectId}/webhook/confirm`, {
        method: "POST",
    })
}

export function updateDashboardPublishSettings(
    projectId: string,
    settings: { autoPublish: boolean; publishMode?: PublishMode }
): Promise<ProjectStatus> {
    return apiRequest<ProjectStatus>(`/api/dashboard/projects/${projectId}/publish`, {
        method: "PATCH",
        body: JSON.stringify(settings),
    })
}

export function updateDashboardAutomationSettings(
    projectId: string,
    settings: { autoSync: boolean }
): Promise<ProjectStatus> {
    return apiRequest<ProjectStatus>(`/api/dashboard/projects/${projectId}/automation`, {
        method: "PATCH",
        body: JSON.stringify(settings),
    })
}

export function deleteDashboardProject(
    projectId: string,
    options: { deleteFramerCollection: boolean }
): Promise<DeleteProjectResponse> {
    return apiRequest<DeleteProjectResponse>(`/api/dashboard/projects/${projectId}`, {
        method: "DELETE",
        body: JSON.stringify(options),
    })
}

export interface ImportFromFramerResult {
    imported: number
    skipped: number
    warnings: string[]
}

export function importDashboardFramerRows(
    projectId: string,
    options?: { framerCollectionId?: string }
): Promise<ImportFromFramerResult> {
    return apiRequest<ImportFromFramerResult>(`/api/dashboard/projects/${projectId}/import-from-framer`, {
        method: "POST",
        body: JSON.stringify(options ?? {}),
    })
}
