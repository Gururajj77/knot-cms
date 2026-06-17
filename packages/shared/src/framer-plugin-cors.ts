/** Must match `id` in packages/plugin/framer.json. */
export const FRAMER_PLUGIN_MARKETPLACE_ID = "knotcms"

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** Production and versioned Framer plugin CDN origins. */
export function isFramerPluginOrigin(
    origin: string,
    pluginId: string = FRAMER_PLUGIN_MARKETPLACE_ID
): boolean {
    try {
        const url = new URL(origin)
        if (url.protocol !== "https:") return false
        const pattern = new RegExp(
            `^${escapeRegExp(pluginId)}(-[a-zA-Z0-9]+)?\\.plugins\\.framercdn\\.com$`
        )
        return pattern.test(url.hostname)
    } catch {
        return false
    }
}

/** Local plugin dev (Vite / wrangler). */
export function isPluginDevOrigin(origin: string): boolean {
    try {
        const url = new URL(origin)
        if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") return false
        return url.protocol === "http:" || url.protocol === "https:"
    } catch {
        return false
    }
}

export function isAllowedPluginApiOrigin(origin: string | undefined | null): boolean {
    if (!origin) return false
    return isFramerPluginOrigin(origin) || isPluginDevOrigin(origin)
}
