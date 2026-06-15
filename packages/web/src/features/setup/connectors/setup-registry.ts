import { googleSheetsSetupPlugin } from "./google-sheets/setup-plugin"
import { notionSetupPlugin } from "./notion/setup-plugin"
import type { SetupWizardPlugin } from "./setup-plugin"
import type { ConnectorId } from "./types"

const SETUP_PLUGINS: Partial<Record<ConnectorId, SetupWizardPlugin>> = {
    notion: notionSetupPlugin,
    google_sheets: googleSheetsSetupPlugin,
}

/** Connect step shows these connectors (available sources for new projects). */
export const SETUP_CONNECTOR_IDS: ConnectorId[] = ["notion", "google_sheets"]

export function getSetupWizardPlugin(connectorId: ConnectorId): SetupWizardPlugin {
    const plugin = SETUP_PLUGINS[connectorId]
    if (!plugin) {
        throw new Error(`No setup wizard plugin registered for connector: ${connectorId}`)
    }
    return plugin
}
