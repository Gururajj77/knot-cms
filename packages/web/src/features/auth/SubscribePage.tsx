import { logout } from "../../lib/api"
import { AuthLayout } from "../../components/layout"
import { Button, ButtonLink } from "../../components/ui"

interface SubscribePageProps {
    email: string
    checkoutUrl?: string | null
}

export function SubscribePage({ email, checkoutUrl }: SubscribePageProps) {
    return (
        <AuthLayout
            title="Subscribe"
            subtitle={
                <>
                    <strong>{email}</strong> needs an active subscription. Use the same email at checkout as
                    your Google account.
                </>
            }
        >
            {checkoutUrl ? (
                <ButtonLink href={checkoutUrl} variant="primary">
                    Subscribe now
                </ButtonLink>
            ) : (
                <p className="pf-muted">Checkout URL is not configured yet.</p>
            )}
            <Button variant="ghost" onClick={() => void logout().then(() => window.location.reload())}>
                Sign out
            </Button>
        </AuthLayout>
    )
}
