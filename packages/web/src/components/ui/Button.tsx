import type { ButtonHTMLAttributes, ReactNode } from "react"
import { cn } from "../../lib/cn"

export type ButtonVariant = "primary" | "secondary" | "ghost" | "google" | "danger"

export function buttonClass(variant: ButtonVariant = "primary", className?: string): string {
    return cn("pf-btn", `pf-btn--${variant}`, className)
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant
    children: ReactNode
}

export function Button({ variant = "primary", className, children, ...props }: ButtonProps) {
    return (
        <button type="button" className={buttonClass(variant, className)} {...props}>
            {children}
        </button>
    )
}

interface ButtonLinkProps {
    href: string
    variant?: ButtonVariant
    className?: string
    children: ReactNode
}

export function ButtonLink({ href, variant = "primary", className, children }: ButtonLinkProps) {
    const external = href.startsWith("http://") || href.startsWith("https://")
    return (
        <a
            href={href}
            className={cn(buttonClass(variant), className)}
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
            {children}
        </a>
    )
}
