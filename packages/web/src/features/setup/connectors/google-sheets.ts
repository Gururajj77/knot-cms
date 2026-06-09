import type { ConnectorRuntime } from "./types"

export const googleSheetsConnector: ConnectorRuntime = {
    definition: {
        id: "google_sheets",
        name: "Google Sheets",
        description: "Pull rows from a spreadsheet in Google Drive.",
        status: "coming_soon",
        sourcePickerDescription: "Select the Google Sheet to sync to Framer CMS.",
    },
    oauthCompleteEventType: "google-sheets-oauth-complete",
    oauthPopupName: "google-sheets-oauth",
    setupReturnPath: "/setup",
    oauthStartPath: () => "",
    loadSourcesErrorLabel: "Google Sheets",
}
