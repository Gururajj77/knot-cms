import type { PluginSiteStatusResponse } from "@knotcms/shared"
import { buildFramerProjectUrlFromEditorId } from "@knotcms/shared"
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

/** Browser-style Server API URLs to try when matching stored project links. */
export function framerProjectUrlCandidates(
    framerProjectId: string,
    framerProjectName?: string | null
): string[] {
    const id = framerProjectId.trim()
    if (!id) return []

    const urls = new Set<string>()
    urls.add(buildFramerProjectUrlFromEditorId(id))

    const name = framerProjectName?.trim()
    if (name) {
        urls.add(`https://framer.com/projects/${name}--${id}`)
        urls.add(`https://framer.com/projects/${encodeURIComponent(name)}--${id}`)
    }

    return [...urls]
}

export async function fetchPluginSiteStatus(
    framerProjectId: string,
    framerProjectName?: string | null
): Promise<PluginSiteStatusResponse> {
    const urls = framerProjectUrlCandidates(framerProjectId, framerProjectName)
    const params = new URLSearchParams({
        framerProjectId,
        framerProjectUrl: urls[0] ?? buildFramerProjectUrlFromEditorId(framerProjectId),
    })

    const response = await fetch(`${API_BASE_URL}/api/plugin/projects?${params}`)
    if (!response.ok) {
        let detail = `Connection check failed (${response.status})`
        try {
            const body = (await response.json()) as { error?: string }
            if (body.error) detail = body.error
        } catch {
            /* ignore */
        }
        throw new Error(detail)
    }

    const body = (await response.json()) as PluginSiteStatusResponse
    if (body.connected || urls.length <= 1) {
        return body
    }

    // Older workers only read framerProjectUrl — try name--id style URLs.
    for (const framerProjectUrl of urls.slice(1)) {
        const fallbackParams = new URLSearchParams({ framerProjectUrl })
        const fallback = await fetch(`${API_BASE_URL}/api/plugin/projects?${fallbackParams}`)
        if (!fallback.ok) continue
        const fallbackBody = (await fallback.json()) as PluginSiteStatusResponse
        if (fallbackBody.connected) return fallbackBody
    }

    return body
}

export function setupUrlWithFramerProject(setupUrl: string, framerProjectId: string): string {
    const url = new URL(setupUrl)
    url.searchParams.set("framerProjectId", framerProjectId)
    return url.toString()
}

export function projectDashboardUrl(webAppUrl: string, projectId: string): string {
    return `${webAppUrl.replace(/\/$/, "")}/projects/${projectId}`
}
