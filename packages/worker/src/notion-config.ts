import type { Env } from "./env.js"

const PLACEHOLDER_MARKERS = ["your-notion", "changeme", "example", "placeholder"]

export function getNotionOAuthSetupError(env: Env): string | null {
    const clientId = env.NOTION_CLIENT_ID?.trim() ?? ""
    const clientSecret = env.NOTION_CLIENT_SECRET?.trim() ?? ""

    if (!clientId || !clientSecret) {
        return "NOTION_CLIENT_ID and NOTION_CLIENT_SECRET are missing in packages/worker/.dev.vars"
    }

    const combined = `${clientId} ${clientSecret}`.toLowerCase()
    if (PLACEHOLDER_MARKERS.some(m => combined.includes(m))) {
        return "Notion OAuth still uses placeholder values. Replace them in packages/worker/.dev.vars with credentials from notion.com/my-integrations"
    }

    // Notion OAuth client IDs are UUIDs (36 chars with hyphens)
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientId)) {
        return "NOTION_CLIENT_ID does not look valid. Copy the OAuth Client ID from your Notion integration settings."
    }

    return null
}
