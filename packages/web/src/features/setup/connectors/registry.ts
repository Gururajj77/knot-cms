import { airtableConnector } from "./airtable"
import { googleSheetsConnector } from "./google-sheets"
import { notionConnector } from "./notion"
import type { ConnectorDefinition, ConnectorId, ConnectorRuntime } from "./types"

/** Register connectors here — order controls display on the connect step. */
const CONNECTORS: ConnectorRuntime[] = [notionConnector, airtableConnector, googleSheetsConnector]

const CONNECTOR_RUNTIMES: Record<ConnectorId, ConnectorRuntime> = Object.fromEntries(
    CONNECTORS.map(c => [c.definition.id, c])
) as Record<ConnectorId, ConnectorRuntime>

export const CONNECTOR_DEFINITIONS: ConnectorDefinition[] = CONNECTORS.map(c => c.definition)

const DEFAULT_CONNECTOR_ID: ConnectorId = "notion"

export function getConnector(id: ConnectorId): ConnectorRuntime {
    return CONNECTOR_RUNTIMES[id]
}

export function getConnectorByOAuthEvent(eventType: string): ConnectorRuntime | undefined {
    return CONNECTORS.find(c => c.oauthCompleteEventType === eventType)
}
