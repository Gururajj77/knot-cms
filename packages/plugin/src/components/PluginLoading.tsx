export function PluginLoading() {
    return (
        <div className="pf-plugin pf-plugin--loading" aria-busy aria-label="Loading">
            <header className="pf-plugin-topbar">
                <div className="pf-plugin-skeleton pf-plugin-skeleton--brand" />
            </header>

            <main className="pf-plugin-main">
                <div className="pf-plugin-skeleton pf-plugin-skeleton--eyebrow" />
                <div className="pf-plugin-skeleton pf-plugin-skeleton--title" />
                <div className="pf-plugin-skeleton pf-plugin-skeleton--line pf-plugin-skeleton--short" />
                <div className="pf-plugin-skeleton pf-plugin-skeleton--actions" />
                <div className="pf-plugin-skeleton pf-plugin-skeleton--strip" />
            </main>
        </div>
    )
}
