import { useEffect, type ReactNode } from "react"
import { X } from "lucide-react"
import { Button, type ButtonVariant } from "./Button"
import { cn } from "../../lib/cn"

interface ModalProps {
    open: boolean
    title: string
    description?: string
    children?: ReactNode
    confirmLabel?: string
    cancelLabel?: string
    confirmVariant?: "primary" | "danger"
    busy?: boolean
    confirmDisabled?: boolean
    hideFooterCancel?: boolean
    secondaryConfirmLabel?: string
    secondaryConfirmVariant?: ButtonVariant
    secondaryConfirmDisabled?: boolean
    onSecondaryConfirm?: () => void
    onConfirm: () => void
    onCancel: () => void
}

export function Modal({
    open,
    title,
    description,
    children,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    confirmVariant = "primary",
    busy = false,
    confirmDisabled = false,
    hideFooterCancel = false,
    secondaryConfirmLabel,
    secondaryConfirmVariant = "secondary",
    secondaryConfirmDisabled = false,
    onSecondaryConfirm,
    onConfirm,
    onCancel,
}: ModalProps) {
    useEffect(() => {
        if (!open) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onCancel()
        }
        document.addEventListener("keydown", onKey)
        document.body.style.overflow = "hidden"
        return () => {
            document.removeEventListener("keydown", onKey)
            document.body.style.overflow = ""
        }
    }, [open, onCancel])

    if (!open) return null

    const hasSplitFooter = Boolean(hideFooterCancel && secondaryConfirmLabel && onSecondaryConfirm)

    return (
        <div className="pf-modal-overlay" role="presentation" onClick={onCancel}>
            <div
                className="pf-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="pf-modal-title"
                onClick={e => e.stopPropagation()}
            >
                <div className="pf-modal-header">
                    <div>
                        <h2 id="pf-modal-title" className="pf-modal-title">
                            {title}
                        </h2>
                        {description ? <p className="pf-modal-desc">{description}</p> : null}
                    </div>
                    <button type="button" className="pf-modal-close" onClick={onCancel} aria-label="Close">
                        <X size={18} />
                    </button>
                </div>
                {children ? <div className="pf-modal-body">{children}</div> : null}
                <div className={cn("pf-modal-footer", hasSplitFooter && "pf-modal-footer--split")}>
                    {!hideFooterCancel ? (
                        <Button variant="secondary" onClick={onCancel} disabled={busy}>
                            {cancelLabel}
                        </Button>
                    ) : null}
                    {hasSplitFooter ? (
                        <>
                            <Button
                                variant={confirmVariant}
                                onClick={onConfirm}
                                disabled={busy || confirmDisabled}
                            >
                                {busy ? "Working…" : confirmLabel}
                            </Button>
                            <Button
                                variant={secondaryConfirmVariant}
                                onClick={onSecondaryConfirm}
                                disabled={busy || secondaryConfirmDisabled}
                            >
                                {busy ? "Working…" : secondaryConfirmLabel}
                            </Button>
                        </>
                    ) : (
                        <>
                            {secondaryConfirmLabel && onSecondaryConfirm ? (
                                <Button
                                    variant={secondaryConfirmVariant}
                                    onClick={onSecondaryConfirm}
                                    disabled={busy || secondaryConfirmDisabled}
                                >
                                    {busy ? "Working…" : secondaryConfirmLabel}
                                </Button>
                            ) : null}
                            <Button
                                variant={confirmVariant}
                                onClick={onConfirm}
                                disabled={busy || confirmDisabled}
                            >
                                {busy ? "Working…" : confirmLabel}
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
