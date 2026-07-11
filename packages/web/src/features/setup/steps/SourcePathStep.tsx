import type { SetupPathId } from "@knotcms/shared"
import type { FramerCollectionSummary } from "../../../lib/api"
import { Banner } from "../../../components/ui"
import type { SetupPathOption } from "../connectors/setup-plugin"

interface SourcePathStepProps {
    path: SetupPathId | null
    pathOptions: SetupPathOption[]
    reconfigureMode: boolean
    selectedFramerCollection: FramerCollectionSummary | null
    embedded?: boolean
    onPathChange: (path: SetupPathId) => void
}

export function SourcePathStep({
    path,
    pathOptions,
    reconfigureMode,
    selectedFramerCollection,
    embedded = false,
    onPathChange,
}: SourcePathStepProps) {
    if (reconfigureMode) return null

    const activePath = pathOptions.find(option => option.id === path) ?? null
    const needsFramerCollection = activePath?.requiresFramerCollection ?? false
    const missingFramerCollection = needsFramerCollection && !selectedFramerCollection

    const Wrapper = embedded ? "div" : "section"
    const wrapperClass = embedded ? "pf-setup-block pf-setup-block--embedded" : "pf-setup-section"

    return (
        <>
            <Wrapper className={wrapperClass}>
                <div
                    className={`pf-setup-section-head${embedded ? " pf-setup-section-head--compact" : ""}`}
                >
                    <h3 className="pf-setup-section-title">What do you want to do?</h3>
                </div>

                <div className="pf-path-list">
                    {pathOptions.map(option => {
                        const selected = path === option.id
                        const blocked = option.requiresFramerCollection && !selectedFramerCollection
                        return (
                            <button
                                key={option.id}
                                type="button"
                                className={`pf-path-option${selected ? " pf-path-option--selected" : ""}`}
                                onClick={() => onPathChange(option.id)}
                            >
                                <span className="pf-path-option-copy">
                                    <span className="pf-path-option-title">{option.title}</span>
                                    <span className="pf-path-option-desc">{option.description}</span>
                                    {blocked ? (
                                        <span className="pf-path-option-hint">
                                            Select a Framer collection in step 1, or go back and pick one.
                                        </span>
                                    ) : null}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </Wrapper>

            {!path ? null : missingFramerCollection ? (
                <Banner tone="info">
                    Go back to step 1 and select a Framer CMS collection for this path.
                </Banner>
            ) : null}
        </>
    )
}
