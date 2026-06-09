import type { ConnectorRuntime } from "./types"

export const airtableConnector: ConnectorRuntime = {
    definition: {
        id: "airtable",
        name: "Airtable",
        description: "Sync bases and tables from your Airtable workspace.",
        status: "coming_soon",
        sourcePickerDescription: "Select the Airtable table to sync to Framer CMS.",
    },
    oauthCompleteEventType: "airtable-oauth-complete",
    oauthPopupName: "airtable-oauth",
    setupReturnPath: "/setup",
    oauthStartPath: () => "",
    loadSourcesErrorLabel: "Airtable tables",
}
