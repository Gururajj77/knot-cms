import { useState, type ReactNode } from "react"
import { fetchBillingPortal } from "../../lib/api/billing"
import { Button, ButtonLink, type ButtonVariant } from "../../components/ui"

interface BillingPortalButtonProps {
    portalUrl: string | null
    portalUsesApi?: boolean
    variant?: ButtonVariant
    className?: string
    children: ReactNode
    disabled?: boolean
}

export function BillingPortalButton({
    portalUrl,
    portalUsesApi = false,
    variant = "primary",
    className,
    children,
    disabled = false,
}: BillingPortalButtonProps) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const openPortal = async () => {
        setLoading(true)
        setError(null)
        try {
            const { url } = await fetchBillingPortal()
            window.open(url, "_blank", "noopener,noreferrer")
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not open billing portal")
        } finally {
            setLoading(false)
        }
    }

    if (portalUsesApi) {
        return (
            <div>
                <Button
                    variant={variant}
                    className={className}
                    onClick={() => void openPortal()}
                    disabled={disabled || loading}
                >
                    {loading ? "Opening portal…" : children}
                </Button>
                {error ? <p className="pf-usage-meter-hint pf-usage-meter-hint--warn">{error}</p> : null}
            </div>
        )
    }

    if (!portalUrl) return null

    return (
        <ButtonLink href={portalUrl} variant={variant} className={className}>
            {children}
        </ButtonLink>
    )
}
