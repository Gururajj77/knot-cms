import type { StepperStep } from "../../components/ui"

export const SETUP_SESSION_KEY = "pf_setup_session_id"

export const SETUP_STEPS: StepperStep[] = [
    { id: "connect", label: "Source" },
    { id: "source", label: "Data" },
    { id: "mapping", label: "Mapping" },
]

export type SetupStepId = (typeof SETUP_STEPS)[number]["id"]
