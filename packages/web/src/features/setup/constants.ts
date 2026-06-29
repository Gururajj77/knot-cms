import type {
    FieldMapping,
    FramerSyncDestination,
    FramerSyncTarget,
    SetupPathId,
} from "@knotcms/shared"
import type { DataSourceSummary } from "../../lib/api"
import type { StepperStep } from "../../components/ui"

export const SETUP_SESSION_KEY = "pf_setup_session_id"
export const SETUP_CONNECTOR_KEY = "pf_setup_connector_id"
const SETUP_WIZARD_DRAFT_KEY = "pf_setup_wizard_draft"

export type SetupConnectorId = "notion" | "google_sheets" | "airtable"

function isSetupConnectorId(value: string | null | undefined): value is SetupConnectorId {
    return value === "notion" || value === "google_sheets" || value === "airtable"
}

export function readSetupConnectorId(): SetupConnectorId | null {
    const stored = sessionStorage.getItem(SETUP_CONNECTOR_KEY)
    if (isSetupConnectorId(stored)) return stored

    return null
}

export function writeSetupConnectorId(connectorId: SetupConnectorId): void {
    sessionStorage.setItem(SETUP_CONNECTOR_KEY, connectorId)
}

export function clearSetupSessionState(): void {
    sessionStorage.removeItem(SETUP_SESSION_KEY)
    sessionStorage.removeItem(SETUP_CONNECTOR_KEY)
}

export const SETUP_STEPS: StepperStep[] = [
    { id: "framer", label: "Framer" },
    { id: "source", label: "Source" },
    { id: "mapping", label: "Mapping" },
]

export type SetupStepId = (typeof SETUP_STEPS)[number]["id"]

export interface SetupWizardDraft {
    step?: SetupStepId
    path?: SetupPathId
    framerProjectUrl?: string
    framerApiKey?: string
    selectedFramerCollectionId?: string | null
    framerSyncTarget?: FramerSyncTarget | null
    syncDestination?: FramerSyncDestination
    selectedSource?: DataSourceSummary | null
    mappings?: FieldMapping[]
    slugPropertyId?: string
}

function normalizeSetupStep(step: SetupStepId | "notion" | undefined): SetupStepId {
    if (step === "notion") return "source"
    return step ?? "framer"
}

function initialSetupStep(draft: SetupWizardDraft | null): SetupStepId {
    const step = normalizeSetupStep(draft?.step)
    if (step === "mapping" && !draft?.selectedSource) return "source"
    return step
}

export function readSetupWizardDraft(): SetupWizardDraft | null {
    try {
        const raw = sessionStorage.getItem(SETUP_WIZARD_DRAFT_KEY)
        if (!raw) return null
        return JSON.parse(raw) as SetupWizardDraft
    } catch {
        return null
    }
}

export function writeSetupWizardDraft(draft: SetupWizardDraft): void {
    sessionStorage.setItem(SETUP_WIZARD_DRAFT_KEY, JSON.stringify(draft))
}

export function clearSetupWizardDraft(): void {
    sessionStorage.removeItem(SETUP_WIZARD_DRAFT_KEY)
    clearSetupSessionState()
}

export { initialSetupStep }
