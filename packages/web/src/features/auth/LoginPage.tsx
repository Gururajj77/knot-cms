import { LegalFooter } from "../../components/legal/LegalFooter"
import { LoginLayout } from "../../components/layout/LoginLayout"
import { GoogleSignInButton } from "./GoogleSignInButton"

export function LoginPage() {
    return (
        <LoginLayout
            footer={
                <>
                    <p className="pf-login-fineprint">
                        Free tier: 1 project and 3 lifetime syncs. Upgrade from Plan &amp; usage after
                        sign-in.
                    </p>
                    <LegalFooter className="pf-login-legal" centered />
                </>
            }
        >
            <GoogleSignInButton />
            <p className="pf-login-hint">
                Already subscribed? Sign in with the <strong>same email</strong> you used at
                checkout.
            </p>
        </LoginLayout>
    )
}
