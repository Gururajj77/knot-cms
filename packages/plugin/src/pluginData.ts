import type { ManagedCollection } from "framer-plugin"
import { PLUGIN_KEYS } from "@notion-framer/shared"

export { PLUGIN_KEYS }

export type SavedPluginConnection = {
    projectId: string
    framerProjectUrl: string
    notionDataSourceTitle: string | null
    framerCollectionName: string | null
    lastSyncAt: string | null
}

export async function readPluginConnection(
    collection: ManagedCollection
): Promise<SavedPluginConnection | null> {
    const projectId = await collection.getPluginData(PLUGIN_KEYS.PROJECT_ID)
    const framerProjectUrl = await collection.getPluginData(PLUGIN_KEYS.FRAMER_PROJECT_URL)
    if (!projectId || !framerProjectUrl) return null

    return {
        projectId,
        framerProjectUrl,
        notionDataSourceTitle: (await collection.getPluginData("notionTitle")) || null,
        framerCollectionName: (await collection.getPluginData(PLUGIN_KEYS.COLLECTION_NAME)) || null,
        lastSyncAt: (await collection.getPluginData("lastSyncAt")) || null,
    }
}

export async function savePluginConnection(
    collection: ManagedCollection,
    connection: SavedPluginConnection
): Promise<void> {
    await collection.setPluginData(PLUGIN_KEYS.PROJECT_ID, connection.projectId)
    await collection.setPluginData(PLUGIN_KEYS.FRAMER_PROJECT_URL, connection.framerProjectUrl)
    await collection.setPluginData(
        "notionTitle",
        connection.notionDataSourceTitle ?? ""
    )
    await collection.setPluginData(
        PLUGIN_KEYS.COLLECTION_NAME,
        connection.framerCollectionName ?? ""
    )
    await collection.setPluginData("lastSyncAt", connection.lastSyncAt ?? "")
}

export async function clearPluginConnection(collection: ManagedCollection): Promise<void> {
    for (const key of [
        PLUGIN_KEYS.PROJECT_ID,
        PLUGIN_KEYS.FRAMER_PROJECT_URL,
        PLUGIN_KEYS.COLLECTION_NAME,
        "notionTitle",
        "lastSyncAt",
    ]) {
        await collection.setPluginData(key, "")
    }
}

export function openDashboardUrl(path: string, webAppUrl: string): void {
    const url = path.startsWith("http") ? path : `${webAppUrl.replace(/\/$/, "")}${path}`
    window.open(url, "_blank", "noopener,noreferrer")
}
