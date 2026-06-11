import { API_BASE_URL } from "./config"

export async function fetchPluginConfig(): Promise<{ webAppUrl: string }> {
    const response = await fetch(`${API_BASE_URL}/api/plugin/config`)
    if (!response.ok) {
        throw new Error("Could not reach KnotCMS")
    }
    return response.json() as Promise<{ webAppUrl: string }>
}
