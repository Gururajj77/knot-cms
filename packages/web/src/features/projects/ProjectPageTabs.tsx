export type ProjectPageTab = "overview" | "settings"

interface ProjectPageTabsProps {
    active: ProjectPageTab
    onChange: (tab: ProjectPageTab) => void
}

const TABS: Array<{ id: ProjectPageTab; label: string }> = [
    { id: "overview", label: "Overview" },
    { id: "settings", label: "Settings" },
]

export function ProjectPageTabs({ active, onChange }: ProjectPageTabsProps) {
    return (
        <div className="pf-project-tabs" role="tablist" aria-label="Project views">
            {TABS.map(tab => (
                <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    id={`project-tab-${tab.id}`}
                    aria-selected={active === tab.id}
                    aria-controls={`project-panel-${tab.id}`}
                    className={`pf-project-tab${active === tab.id ? " pf-project-tab--active" : ""}`}
                    onClick={() => onChange(tab.id)}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    )
}
