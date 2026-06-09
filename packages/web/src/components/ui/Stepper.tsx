import { Check } from "lucide-react"
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
                            {done ? <Check size={12} strokeWidth={2.5} aria-hidden /> : index + 1}
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
