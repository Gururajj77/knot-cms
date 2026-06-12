import type {
    FieldMapping,
    FramerSyncDestination,
    FramerSyncTarget,
    SetupPathId,
} from "@knotcms/shared"
import type { DataSourceSummary } from "../../lib/api"
import type { StepperStep } from "../../components/ui"

export const SETUP_SESSION_KEY = "pf_setup_session_id"
export const SETUP_WIZARD_DRAFT_KEY = "pf_setup_wizard_draft"

export const SETUP_STEPS: StepperStep[] = [
    { id: "framer", label: "Framer" },
    { id: "notion", label: "Notion" },
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

function initialSetupStep(draft: SetupWizardDraft | null): SetupStepId {
    const step = draft?.step ?? "framer"
    if (step === "mapping" && !draft?.selectedSource) return "notion"
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
}

export { initialSetupStep }
