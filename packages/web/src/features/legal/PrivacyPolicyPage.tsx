import { LegalPageLayout } from "../../components/legal/LegalPageLayout"
import { PrivacyPolicyContent } from "../../content/legal/privacy-policy"
import { formatLegalLastUpdated, LEGAL_LAST_UPDATED } from "../../config/site"

export function PrivacyPolicyPage() {
    return (
        <LegalPageLayout
            title="Privacy Policy"
            lastUpdated={formatLegalLastUpdated(LEGAL_LAST_UPDATED)}
        >
            <PrivacyPolicyContent />
        </LegalPageLayout>
    )
}
