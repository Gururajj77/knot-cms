import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react"
import { cn } from "../../lib/cn"

interface FieldProps {
    label: string
    htmlFor: string
    children: ReactNode
    className?: string
}

export function Field({ label, htmlFor, children, className }: FieldProps) {
    return (
        <div className={cn("pf-field", className)}>
            <label htmlFor={htmlFor}>{label}</label>
            {children}
        </div>
    )
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
    return <input className={cn("pf-input", className)} {...props} />
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <select className={cn("pf-select", className)} {...props}>
            {children}
        </select>
    )
}

interface CheckboxRowProps {
    checked: boolean
    onChange: (checked: boolean) => void
    disabled?: boolean
    children: ReactNode
}

export function CheckboxRow({ checked, onChange, disabled, children }: CheckboxRowProps) {
    return (
        <label className="pf-check-row">
            <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={e => onChange(e.target.checked)}
            />
            {children}
        </label>
    )
}
