interface StepperProps {
    steps: Array<{ id: string; label: string }>
    current: string
}

export function Stepper({ steps, current }: StepperProps) {
    const currentIndex = steps.findIndex(s => s.id === current)

    return (
        <nav className="pf-stepper" aria-label="Setup progress">
            {steps.map((step, index) => {
                const done = index < currentIndex
                const active = step.id === current
                return (
                    <div key={step.id} className="pf-stepper-item">
                        <div
                            className={[
                                "pf-stepper-dot",
                                done ? "pf-stepper-dot--done" : "",
                                active ? "pf-stepper-dot--active" : "",
                            ]
                                .filter(Boolean)
                                .join(" ")}
                            aria-current={active ? "step" : undefined}
                        >
                            {done ? "✓" : index + 1}
                        </div>
                        <span
                            className={[
                                "pf-stepper-label",
                                active ? "pf-stepper-label--active" : "",
                            ]
                                .filter(Boolean)
                                .join(" ")}
                        >
                            {step.label}
                        </span>
                        {index < steps.length - 1 ? <span className="pf-stepper-line" aria-hidden /> : null}
                    </div>
                )
            })}
        </nav>
    )
}
