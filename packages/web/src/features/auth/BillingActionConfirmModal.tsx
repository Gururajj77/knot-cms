import { useEffect, useState, type ReactNode } from "react"
import { Modal } from "../../components/ui/Modal"
import { Field, Input } from "../../components/ui"

export const BILLING_CONFIRM_KEYWORD = "KNOTKNOT"

interface BillingActionConfirmModalProps {
    open: boolean
    title: string
    description?: string
    details: ReactNode
    confirmLabel: string
    confirmVariant?: "primary" | "danger"
    busy?: boolean
    onConfirm: () => void
    onCancel: () => void
    secondaryConfirmLabel?: string
    onSecondaryConfirm?: () => void
    secondaryConfirmDisabled?: boolean
    requireKeywordForConfirm?: boolean
}

export function BillingActionConfirmModal({
    open,
    title,
    description,
    details,
    confirmLabel,
    confirmVariant = "primary",
    busy = false,
    onConfirm,
    onCancel,
    secondaryConfirmLabel,
    onSecondaryConfirm,
    secondaryConfirmDisabled = false,
    requireKeywordForConfirm = true,
}: BillingActionConfirmModalProps) {
    const [confirmText, setConfirmText] = useState("")

    useEffect(() => {
        if (!open) setConfirmText("")
    }, [open])

    const keywordMatched = confirmText.trim() === BILLING_CONFIRM_KEYWORD
    const confirmDisabled = requireKeywordForConfirm && !keywordMatched

    return (
        <Modal
            open={open}
            title={title}
            description={description}
            confirmLabel={confirmLabel}
            confirmVariant={confirmVariant}
            busy={busy}
            hideFooterCancel
            confirmDisabled={confirmDisabled}
            secondaryConfirmLabel={secondaryConfirmLabel}
            secondaryConfirmVariant="warning"
            secondaryConfirmDisabled={secondaryConfirmDisabled}
            onSecondaryConfirm={onSecondaryConfirm}
            onConfirm={onConfirm}
            onCancel={onCancel}
        >
            <div className="pf-billing-confirm-modal">
                <div className="pf-billing-confirm-modal-details">{details}</div>
                {requireKeywordForConfirm ? (
                    <Field
                        label={`Type ${BILLING_CONFIRM_KEYWORD} to ${confirmLabel.toLowerCase()}`}
                        htmlFor="billing-confirm-keyword"
                    >
                        <Input
                            id="billing-confirm-keyword"
                            value={confirmText}
                            onChange={event => setConfirmText(event.target.value)}
                            autoComplete="off"
                            spellCheck={false}
                            disabled={busy}
                            placeholder={BILLING_CONFIRM_KEYWORD}
                        />
                    </Field>
                ) : null}
            </div>
        </Modal>
    )
}
