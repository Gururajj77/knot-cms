import { ROUTES } from "../../../constants/routes"
import type { ConnectorRuntime } from "./types"

const definition = {
    id: "notion" as const,
    name: "Notion",
    description: "Authorize the workspace that holds your databases and pages.",
    status: "available" as const,
    sourcePickerDescription: "Select the Notion database to sync to Framer CMS.",
}

export const notionConnector: ConnectorRuntime = {
    definition,
    oauthCompleteEventType: "notion-oauth-complete",
    oauthPopupName: "notion-oauth",
    setupReturnPath: ROUTES.setup,
    oauthStartPath: (setupSessionId, returnTo) => {
        const params = new URLSearchParams({ setup_session_id: setupSessionId, return_to: returnTo })
        return `/oauth/notion/start?${params.toString()}`
    },
    loadSourcesErrorLabel: "Notion databases",
}
