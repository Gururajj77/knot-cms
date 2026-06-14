import { useEffect } from "react"
import { useLocation } from "react-router-dom"
import { LegalPageLayout } from "../../components/legal/LegalPageLayout"
import { TermsContent } from "../../content/legal/terms"
import { formatLegalLastUpdated, LEGAL_LAST_UPDATED } from "../../config/site"

export function TermsPage() {
    const { hash } = useLocation()

    useEffect(() => {
        if (!hash) return
        const id = hash.replace(/^#/, "")
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, [hash])

    return (
        <LegalPageLayout
            title="Terms & Conditions"
            lastUpdated={formatLegalLastUpdated(LEGAL_LAST_UPDATED)}
        >
            <TermsContent />
        </LegalPageLayout>
    )
}
