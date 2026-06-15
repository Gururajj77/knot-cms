export function PluginLoading() {
    return (
        <div className="pf-plugin pf-plugin--loading" aria-busy aria-label="Loading">
            <header className="pf-plugin-topbar">
                <div className="pf-plugin-skeleton pf-plugin-skeleton--brand" />
            </header>

            <main className="pf-plugin-body">
                <div className="pf-plugin-skeleton pf-plugin-skeleton--status" />
                <div className="pf-plugin-skeleton pf-plugin-skeleton--panel" />
                <div className="pf-plugin-skeleton pf-plugin-skeleton--button" />
                <div className="pf-plugin-skeleton pf-plugin-skeleton--button pf-plugin-skeleton--muted" />
            </main>
        </div>
    )
}
