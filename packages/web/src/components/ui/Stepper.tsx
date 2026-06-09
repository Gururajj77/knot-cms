import { cn } from "../../lib/cn"

export interface StepperStep {
    id: string
    label: string
}

interface StepperProps {
    steps: StepperStep[]
    current: string
}

export function Stepper({ steps, current }: StepperProps) {
    const currentIndex = steps.findIndex(s => s.id === current)

    return (
        <nav className="pf-stepper" aria-label="Progress">
            {steps.map((step, index) => {
                const done = index < currentIndex
                const active = step.id === current
                return (
                    <div key={step.id} className="pf-stepper-item">
                        <div
                            className={cn(
                                "pf-stepper-dot",
                                done && "pf-stepper-dot--done",
                                active && "pf-stepper-dot--active"
                            )}
                            aria-current={active ? "step" : undefined}
                        >
                            {done ? (
                                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                                    <path
                                        d="M2 5L4.2 7.2L8 3.2"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            ) : (
                                index + 1
                            )}
                        </div>
                        <span className={cn("pf-stepper-label", active && "pf-stepper-label--active")}>
                            {step.label}
                        </span>
                        {index < steps.length - 1 ? <span className="pf-stepper-line" aria-hidden /> : null}
                    </div>
                )
            })}
        </nav>
    )
}
