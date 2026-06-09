/** Add new connector ids here and register in `registry.ts`. */
export type ConnectorId = "notion" | "airtable" | "google_sheets"

export type ConnectorStatus = "available" | "coming_soon"

export interface ConnectorDefinition {
    id: ConnectorId
    name: string
    description: string
    status: ConnectorStatus
    /** Shown on step 2 when picking a data source from this connector. */
    sourcePickerDescription: string
}

export interface ConnectorRuntime {
    definition: ConnectorDefinition
    /** `postMessage` event type fired when OAuth completes in the popup. */
    oauthCompleteEventType: string
    oauthPopupName: string
    /** Path to return to after in-tab OAuth (e.g. `/setup`). */
    setupReturnPath: string
    oauthStartPath: (setupSessionId: string, returnTo: string) => string
    loadSourcesErrorLabel: string
}

export interface ConnectorOAuthSession {
    setupSessionId: string
    oauthUrl: string
}
