import type { ReactNode } from "react"

const SETUP_STEPS = ["Connect", "Database", "Mapping"] as const

export type SetupStepIndex = 1 | 2 | 3

interface WizardShellProps {
    children: ReactNode
    /** 1–3 during setup; omit on status dashboard */
    setupStep?: SetupStepIndex
    /** Status / dashboard — no stepper */
    variant?: "setup" | "dashboard"
}

export function WizardShell({ children, setupStep, variant = "setup" }: WizardShellProps) {
    const showStepper = variant === "setup" && setupStep != null

    return (
        <div className="nf-shell">
            <header className="nf-header">
                <div className="nf-brand">
                    <div className="nf-brand-mark" aria-hidden>
                        <span>N</span>
                    </div>
                    <span className="nf-brand-name">NF Sync</span>
                </div>

                {showStepper && (
                    <div className="nf-stepper" aria-label="Setup progress">
                        {SETUP_STEPS.map((label, i) => {
                            const n = i + 1
                            const done = n < setupStep!
                            const current = n === setupStep
                            return (
                                <div key={label} className="nf-stepper-item">
                                    <div
                                        className={[
                                            "nf-step-dot",
                                            done ? "nf-step-dot--done" : "",
                                            current ? "nf-step-dot--current" : "",
                                        ]
                                            .filter(Boolean)
                                            .join(" ")}
                                        title={label}
                                    >
                                        {done ? (
                                            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden>
                                                <path
                                                    d="M1.5 4L3.5 6L6.5 2"
                                                    stroke="currentColor"
                                                    strokeWidth="1.5"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                            </svg>
                                        ) : (
                                            n
                                        )}
                                    </div>
                                    {i < SETUP_STEPS.length - 1 && (
                                        <div
                                            className={[
                                                "nf-step-line",
                                                done ? "nf-step-line--done" : "",
                                            ]
                                                .filter(Boolean)
                                                .join(" ")}
                                        />
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}

                {variant === "dashboard" && (
                    <div className="nf-header-status">
                        <span className="nf-status-pulse" aria-hidden />
                        <span className="nf-header-status-label">Active</span>
                    </div>
                )}

                <span className="nf-header-counter">
                    {showStepper ? `${setupStep} / ${SETUP_STEPS.length}` : ""}
                </span>
            </header>

            <div className="nf-main">{children}</div>
        </div>
    )
}

export function StepBack({ onClick, children = "Back" }: { onClick: () => void; children?: string }) {
    return (
        <button type="button" className="nf-back" onClick={onClick}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                <path
                    d="M7.5 2L4 6L7.5 10"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
            {children}
        </button>
    )
}

export function StepHeader({ title, description }: { title: string; description: string }) {
    return (
        <div className="nf-step-header">
            <h2 className="nf-title">{title}</h2>
            <p className="nf-desc">{description}</p>
        </div>
    )
}
