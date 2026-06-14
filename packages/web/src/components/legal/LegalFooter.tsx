import { Link } from "react-router-dom"
import { ROUTES } from "../../constants/routes"

interface LegalFooterProps {
    className?: string
    centered?: boolean
}

export function LegalFooter({ className, centered }: LegalFooterProps) {
    return (
        <nav
            className={[className, centered ? "pf-legal-links pf-legal-links--center" : "pf-legal-links"]
                .filter(Boolean)
                .join(" ")}
            aria-label="Legal"
        >
            <Link to={ROUTES.legal.privacy}>Privacy Policy</Link>
            <Link to={ROUTES.legal.terms}>Terms &amp; Conditions</Link>
            <Link to={ROUTES.legal.refund}>Refund Policy</Link>
        </nav>
    )
}
