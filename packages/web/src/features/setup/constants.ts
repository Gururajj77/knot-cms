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

export const DEFAULT_SETUP_PATH: SetupPathId = "notion_to_framer"

export const NEW_PROJECT_SETUP_STEPS: StepperStep[] = [
    { id: "connect", label: "Connect" },
    { id: "review", label: "Review & sync" },
]

export const RECONFIGURE_SETUP_STEPS: StepperStep[] = [
    { id: "framer", label: "Framer" },
    { id: "source", label: "Source" },
    { id: "mapping", label: "Mapping" },
]

/** @deprecated Use NEW_PROJECT_SETUP_STEPS or RECONFIGURE_SETUP_STEPS */
export const SETUP_STEPS = RECONFIGURE_SETUP_STEPS

export type NewProjectSetupStepId = (typeof NEW_PROJECT_SETUP_STEPS)[number]["id"]
export type ReconfigureSetupStepId = (typeof RECONFIGURE_SETUP_STEPS)[number]["id"]
export type SetupStepId = NewProjectSetupStepId | ReconfigureSetupStepId

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
    showAdvanced?: boolean
}

function normalizeSetupStep(
    step: SetupStepId | "notion" | undefined,
    options: { reconfigure?: boolean }
): SetupStepId {
    if (options.reconfigure) {
        if (step === "connect") return "framer"
        if (step === "review") return "source"
        if (step === "notion") return "source"
        return step ?? "framer"
    }

    if (step === "framer") return "connect"
    if (step === "source" || step === "mapping" || step === "notion") return "review"
    return step ?? "connect"
}

function initialSetupStep(
    draft: SetupWizardDraft | null,
    options: { reconfigure?: boolean }
): SetupStepId {
    const step = normalizeSetupStep(draft?.step, options)
    if (options.reconfigure) {
        if (step === "mapping" && !draft?.selectedSource) return "source"
        return step
    }

    if (step === "review" && draft?.selectedSource && draft.mappings?.length) return "review"
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

export { initialSetupStep, normalizeSetupStep }
