import { Check, ChevronRight } from "lucide-react"
import type { FramerCollectionSummary } from "../../../lib/api"
import { Banner, Button, Spinner } from "../../../components/ui"

interface FramerCollectionPickerProps {
    collections: FramerCollectionSummary[]
    selectedCollectionId: string | null
    collectionsLoaded: boolean
    busy: boolean
    canLoad: boolean
    required?: boolean
    onLoadCollections: () => void
    onSelectCollection: (collectionId: string | null) => void
}

export function FramerCollectionPicker({
    collections,
    selectedCollectionId,
    collectionsLoaded,
    busy,
    canLoad,
    required = false,
    onLoadCollections,
    onSelectCollection,
}: FramerCollectionPickerProps) {
    return (
        <div className="pf-framer-collection-picker">
            <div className="pf-setup-section-head pf-setup-section-head--compact">
                <h3 className="pf-setup-section-title">
                    CMS collections{required ? "" : " (optional)"}
                </h3>
                <p className="pf-setup-section-desc">
                    {required
                        ? "Select the Framer CMS collection KnotCMS should sync with."
                        : "Select a collection if you already have Framer CMS content, or leave blank to create a new one."}
                </p>
            </div>

            <div className="pf-mapping-framer-actions">
                <Button
                    variant="secondary"
                    onClick={() => void onLoadCollections()}
                    disabled={busy || !canLoad}
                >
                    {busy && !collectionsLoaded
                        ? "Loading…"
                        : collectionsLoaded
                          ? "Reload collections"
                          : "Load collections"}
                </Button>
                {collectionsLoaded ? (
                    <span className="pf-muted">
                        {collections.length} collection{collections.length === 1 ? "" : "s"} found
                    </span>
                ) : null}
            </div>

            {collectionsLoaded ? (
                collections.length === 0 ? (
                    <Banner tone="info">
                        No CMS collections found in this project. Add one in Framer, then reload.
                    </Banner>
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
                                                {collection.itemCount} items · {collection.fields.length}{" "}
                                                fields
                                                {!collection.canUseAsTemplate ? " · read-only template" : ""}
                                            </span>
                                        </span>
                                        {selected ? (
                                            <Check
                                                size={16}
                                                className="pf-collection-row-check"
                                                aria-hidden
                                            />
                                        ) : (
                                            <ChevronRight
                                                size={16}
                                                className="pf-select-row-chevron"
                                                aria-hidden
                                            />
                                        )}
                                    </button>
                                </li>
                            )
                        })}
                    </ul>
                )
            ) : busy ? (
                <Spinner label="Loading collections…" />
            ) : null}
        </div>
    )
}
