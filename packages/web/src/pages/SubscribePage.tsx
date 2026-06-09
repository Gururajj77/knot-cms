interface SubscribePageProps {
    email: string
    checkoutUrl?: string | null
}

export function SubscribePage({ email, checkoutUrl }: SubscribePageProps) {
    return (
        <div className="pf-center">
            <div className="pf-card" style={{ width: "min(420px, 100%)" }}>
                <h1 className="pf-title">Subscribe to PublishFlow</h1>
                <p className="pf-subtitle">
                    <strong>{email}</strong> needs an active subscription. Use the same email at checkout as
                    your Google account.
                </p>
                {checkoutUrl ? (
                    <a className="pf-button" href={checkoutUrl}>
                        Subscribe now
                    </a>
                ) : (
                    <p className="pf-meta">Checkout URL is not configured yet.</p>
                )}
            </div>
        </div>
    )
}
