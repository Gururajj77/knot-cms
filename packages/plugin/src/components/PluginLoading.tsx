export function PluginLoading() {
    return (
        <div className="pf-plugin pf-plugin--loading" aria-busy aria-label="Loading">
            <div className="pf-plugin-skeleton pf-plugin-skeleton--brand" />
            <div className="pf-plugin-skeleton pf-plugin-skeleton--pipeline" />
            <div className="pf-plugin-skeleton pf-plugin-skeleton--title" />
            <div className="pf-plugin-skeleton pf-plugin-skeleton--line" />
            <div className="pf-plugin-skeleton pf-plugin-skeleton--line pf-plugin-skeleton--short" />
            <div className="pf-plugin-skeleton pf-plugin-skeleton--steps" />
            <div className="pf-plugin-skeleton pf-plugin-skeleton--button" />
        </div>
    )
}
