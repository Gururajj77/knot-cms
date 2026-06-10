import { API_BASE_URL } from "./config"

export type PluginLinkResponse =
    | {
          linked: true
          projectId: string
          notionDataSourceTitle: string | null
          framerCollectionName: string | null
          lastSyncAt: string | null
      }
    | { linked: false }

export async function fetchPluginConfig(): Promise<{ webAppUrl: string }> {
    const response = await fetch(`${API_BASE_URL}/api/plugin/config`)
    if (!response.ok) {
        throw new Error("Could not reach PublishFlow")
    }
    return response.json() as Promise<{ webAppUrl: string }>
}

export async function lookupPluginLink(framerProjectUrl: string): Promise<PluginLinkResponse> {
    const url = new URL(`${API_BASE_URL}/api/plugin/link`)
    url.searchParams.set("framerProjectUrl", framerProjectUrl)
    const response = await fetch(url)
    if (!response.ok) {
        throw new Error("Could not check connection status")
    }
    return response.json() as Promise<PluginLinkResponse>
}
