import type { ProjectStatus } from "@knotcms/shared"
import { getSetupWizardPlugin } from "../features/setup/connectors/setup-registry"
import type { ConnectorId } from "../features/setup/connectors/types"

export function connectorIdForProject(
    sourceProvider: ProjectStatus["sourceProvider"] = "notion"
): ConnectorId {
    return sourceProvider === "google_sheets" ? "google_sheets" : "notion"
}

export function projectSourcePlugin(status: Pick<ProjectStatus, "sourceProvider">) {
    return getSetupWizardPlugin(connectorIdForProject(status.sourceProvider))
}
