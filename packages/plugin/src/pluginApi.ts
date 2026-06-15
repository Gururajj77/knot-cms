import type { PluginSiteStatusResponse } from "@knotcms/shared"
import { API_BASE_URL } from "./config"

export interface PluginConfig {
    webAppUrl: string
    setupUrl: string
    homeUrl: string
}

export async function fetchPluginConfig(): Promise<PluginConfig> {
    const response = await fetch(`${API_BASE_URL}/api/plugin/config`)
    if (!response.ok) {
        throw new Error("Could not reach KnotCMS")
    }
    return response.json() as Promise<PluginConfig>
}

export async function fetchPluginSiteStatus(
    framerProjectUrl: string
): Promise<PluginSiteStatusResponse> {
    const params = new URLSearchParams({ framerProjectUrl })
    const response = await fetch(`${API_BASE_URL}/api/plugin/projects?${params}`)
    if (!response.ok) {
        throw new Error("Could not load connection status")
    }
    return response.json() as Promise<PluginSiteStatusResponse>
}

export function setupUrlWithFramerProject(setupUrl: string, framerProjectUrl: string): string {
    const url = new URL(setupUrl)
    url.searchParams.set("framerProjectUrl", framerProjectUrl)
    return url.toString()
}

export function projectDashboardUrl(webAppUrl: string, projectId: string): string {
    return `${webAppUrl.replace(/\/$/, "")}/projects/${projectId}`
}
