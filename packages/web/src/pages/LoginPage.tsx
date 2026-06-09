export function LoginPage() {
    return (
        <div className="pf-center">
            <div className="pf-card" style={{ width: "min(420px, 100%)" }}>
                <h1 className="pf-title">PublishFlow</h1>
                <p className="pf-subtitle">
                    Connect Notion to Framer CMS. Write in Notion — your Framer site stays in sync.
                </p>
                <a className="pf-button" href="/auth/google/start?return_to=/">
                    Continue with Google
                </a>
            </div>
        </div>
    )
}
