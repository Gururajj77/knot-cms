import { AuthLayout } from "../components/AuthLayout"
import { logout } from "../api"

interface SubscribePageProps {
    email: string
    checkoutUrl?: string | null
}

export function SubscribePage({ email, checkoutUrl }: SubscribePageProps) {
    return (
        <AuthLayout
            title="Subscribe to PublishFlow"
            subtitle={
                <>
                    <strong>{email}</strong> needs an active subscription. Use the same email at checkout as
                    your Google account.
                </>
            }
        >
            {checkoutUrl ? (
                <a className="pf-button" href={checkoutUrl}>
                    Subscribe now
                </a>
            ) : (
                <p className="pf-meta">Checkout URL is not configured yet.</p>
            )}
            <button
                type="button"
                className="ghost"
                style={{ justifySelf: "start" }}
                onClick={() => void logout().then(() => window.location.reload())}
            >
                Sign out
            </button>
        </AuthLayout>
    )
}
