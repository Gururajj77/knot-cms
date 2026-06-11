import { Check, ChevronRight } from "lucide-react"
import { Link } from "react-router-dom"
import type { FramerCollectionSummary } from "../../../lib/api"
import { ROUTES } from "../../../constants/routes"
import { FramerLogo } from "../../../components/brand"
import { Banner, Button, Field, Input, Spinner, buttonClass } from "../../../components/ui"

interface FramerStepProps {
    framerProjectUrl: string
    framerApiKey: string
    collections: FramerCollectionSummary[]
    selectedCollectionId: string | null
    selectedCollectionName?: string | null
    collectionsLoaded: boolean
    busy: boolean
    onUrlChange: (url: string) => void
    onKeyChange: (key: string) => void
    onLoadCollections: () => void
    onSelectCollection: (collectionId: string | null) => void
    onContinue: () => void
}

export function FramerStep({
    framerProjectUrl,
    framerApiKey,
    collections,
    selectedCollectionId,
    selectedCollectionName,
    collectionsLoaded,
    busy,
    onUrlChange,
    onKeyChange,
    onLoadCollections,
    onSelectCollection,
    onContinue,
}: FramerStepProps) {
    const canLoad = framerProjectUrl.trim().length > 0 && framerApiKey.trim().length >= 8
    const canContinue = collectionsLoaded && canLoad

    return (
        <div className="pf-setup-step">
            <header className="pf-setup-step-header">
                <p className="pf-eyebrow">Step 1 · Framer</p>
                <h2 className="pf-setup-step-title">Connect your Framer project</h2>
                <p className="pf-setup-step-desc">
                    Your project URL and Server API key let KnotCMS read CMS collections and sync updates.
                </p>
            </header>

            <section className="pf-setup-section pf-setup-section--accent">
                <div className="pf-setup-section-head">
                    <h3 className="pf-setup-section-title">
                        <FramerLogo size={18} />
                        Framer credentials
                    </h3>
                    <p className="pf-setup-section-desc">
                        From Site Settings → General in Framer. Encrypted at rest — never shown again.
                    </p>
                </div>

                <div className="pf-form-grid">
                    <Field label="Framer project URL" htmlFor="framer-url">
                        <Input
                            id="framer-url"
                            placeholder="https://framer.com/projects/..."
                            value={framerProjectUrl}
                            onChange={e => onUrlChange(e.target.value)}
                        />
                    </Field>

                    <Field label="Server API key" htmlFor="framer-key">
                        <Input
                            id="framer-key"
                            type="password"
                            autoComplete="off"
                            value={framerApiKey}
                            onChange={e => onKeyChange(e.target.value)}
                        />
                    </Field>
                </div>

                <div className="pf-mapping-framer-actions">
                    <Button
                        variant="secondary"
                        onClick={() => void onLoadCollections()}
                        disabled={busy || !canLoad}
                    >
                        {busy && !collectionsLoaded ? "Loading…" : collectionsLoaded ? "Reload collections" : "Load collections"}
                    </Button>
                    {collectionsLoaded ? (
                        <span className="pf-inline-ok">
                            <Check size={15} aria-hidden />
                            {collections.length} collection{collections.length === 1 ? "" : "s"} found
                        </span>
                    ) : (
                        <span className="pf-muted">Required before continuing</span>
                    )}
                </div>
            </section>

            {collectionsLoaded ? (
                <section className="pf-setup-section">
                    <div className="pf-setup-section-head">
                        <h3 className="pf-setup-section-title">CMS collections</h3>
                        <p className="pf-setup-section-desc">
                            Optional now — you&apos;ll pick how to use them in the next step. Select one if you already
                            know you want to start from Framer.
                        </p>
                    </div>

                    {busy ? (
                        <Spinner label="Loading collections…" />
                    ) : collections.length === 0 ? (
                        selectedCollectionId && selectedCollectionName ? (
                            <Banner tone="info">
                                Restoring selection for <strong>{selectedCollectionName}</strong>…
                                reload collections if this does not update.
                            </Banner>
                        ) : (
                            <Banner tone="info">No CMS collections found in this Framer project.</Banner>
                        )
                    ) : (
                        <ul className="pf-select-list pf-select-list--flush">
                            {collections.map(collection => {
                                const selected = selectedCollectionId === collection.id
                                return (
                                    <li key={collection.id}>
                                        <button
                                            type="button"
                                            className={`pf-select-row pf-collection-row${selected ? " pf-collection-row--selected" : ""}`}
                                            onClick={() =>
                                                onSelectCollection(selected ? null : collection.id)
                                            }
                                        >
                                            <span className="pf-select-row-main">
                                                <span className="pf-select-row-title">{collection.name}</span>
                                                <span className="pf-collection-row-meta">
                                                    {collection.itemCount} items · {collection.fields.length} fields
                                                    {!collection.canUseAsTemplate ? " · read-only template" : ""}
                                                </span>
                                            </span>
                                            {selected ? (
                                                <Check size={16} className="pf-collection-row-check" aria-hidden />
                                            ) : (
                                                <ChevronRight size={16} className="pf-select-row-chevron" aria-hidden />
                                            )}
                                        </button>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </section>
            ) : null}

            <footer className="pf-setup-footer pf-setup-footer--split">
                <Link className={buttonClass("ghost")} to={ROUTES.home}>
                    Cancel
                </Link>
                <Button onClick={onContinue} disabled={!canContinue || busy}>
                    Continue
                </Button>
            </footer>
        </div>
    )
}
