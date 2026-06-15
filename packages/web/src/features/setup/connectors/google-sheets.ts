import { GOOGLE_SHEETS_CONNECTOR_LAUNCHED } from "@knotcms/shared"
import type { ConnectorRuntime } from "./types"

export const googleSheetsConnector: ConnectorRuntime = {
    definition: {
        id: "google_sheets",
        name: "Google Sheets",
        description: GOOGLE_SHEETS_CONNECTOR_LAUNCHED
            ? "Pull rows from a spreadsheet in Google Drive."
            : "Sync spreadsheet rows to Framer CMS — available soon.",
        status: GOOGLE_SHEETS_CONNECTOR_LAUNCHED ? "available" : "coming_soon",
        sourcePickerDescription: "Select the Google Sheet and tab to sync to Framer CMS.",
    },
    oauthCompleteEventType: "google-sheets-oauth-complete",
    oauthPopupName: "google-sheets-oauth",
    setupReturnPath: "/setup",
    oauthStartPath: (setupSessionId, returnTo) =>
        `/oauth/google-sheets/start?setup_session_id=${encodeURIComponent(setupSessionId)}&return_to=${encodeURIComponent(returnTo)}`,
    loadSourcesErrorLabel: "Google Sheets",
}
