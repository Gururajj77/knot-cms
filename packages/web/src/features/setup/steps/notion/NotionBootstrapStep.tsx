import type { ChangeEvent } from "react"
import type { FramerCollectionSummary } from "../../../../lib/api"
import { Banner, Button, Field, Input } from "../../../../components/ui"
import { INCOMPLETE_IMPORT_DISCLAIMER } from "../../connectors/notion/setup-plugin"

interface NotionBootstrapStepProps {
    selectedFramerCollection: FramerCollectionSummary
    importRowMax: number
    importRowCount: number
    bootstrapWarnings: string[]
    busy: boolean
    onImportRowCountChange: (count: number) => void
    onSelectAllImportRows: () => void
}

export function NotionBootstrapStep({
    selectedFramerCollection,
    importRowMax,
    importRowCount,
    bootstrapWarnings,
    busy,
    onImportRowCountChange,
    onSelectAllImportRows,
}: NotionBootstrapStepProps) {
    const framerRowTotal = selectedFramerCollection.itemCount ?? 0
    const maxImportRows = Math.min(framerRowTotal, importRowMax)
    const showImportDisclaimer = importRowCount > 0

    return (
        <section className="pf-setup-section">
            <div className="pf-setup-section-head">
                <h3 className="pf-setup-section-title">Create Notion database</h3>
                <p className="pf-setup-section-desc">
                    KnotCMS will create a new Notion page and database from{" "}
                    <strong>{selectedFramerCollection.name}</strong>.
                    {selectedFramerCollection.managedBy === "anotherPlugin"
                        ? " Because this collection is owned by another plugin, KnotCMS will sync to a new managed Framer collection (· KnotCMS)."
                        : " Notion will sync back into this same Framer CMS collection."}
                </p>
            </div>

            {!selectedFramerCollection.bootstrapPreview.eligible ? (
                <Banner tone="error">
                    {selectedFramerCollection.bootstrapPreview.ineligibleReason ??
                        "This collection cannot be used as a Notion template."}
                </Banner>
            ) : null}

            {selectedFramerCollection.bootstrapPreview.warnings.length ? (
                <Banner tone="info">
                    {selectedFramerCollection.bootstrapPreview.skippedFieldCount} field
                    {selectedFramerCollection.bootstrapPreview.skippedFieldCount === 1 ? "" : "s"} will not
                    map to Notion in v1 (images, references, etc.).
                </Banner>
            ) : null}

            <Field label="Rows to import from Framer" htmlFor="import-row-count">
                <div className="pf-import-row-control">
                    <Input
                        id="import-row-count"
                        type="number"
                        min={0}
                        max={maxImportRows}
                        value={importRowCount}
                        disabled={busy || maxImportRows === 0}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            const next = Number.parseInt(e.target.value, 10)
                            onImportRowCountChange(
                                Number.isNaN(next) ? 0 : Math.max(0, Math.min(next, maxImportRows))
                            )
                        }}
                    />
                    <Button
                        type="button"
                        variant="secondary"
                        disabled={busy || maxImportRows === 0}
                        onClick={onSelectAllImportRows}
                    >
                        Select all
                    </Button>
                </div>
            </Field>
            <p className="pf-muted pf-danger-hint">
                {framerRowTotal > 0
                    ? `${framerRowTotal} published row${framerRowTotal === 1 ? "" : "s"} in this collection (drafts excluded). Enter 0 to create the database without importing rows.`
                    : "This collection has no published rows to import. You can still create the Notion database."}
            </p>

            {showImportDisclaimer ? (
                <Banner tone="warning" className="pf-banner--inset">
                    {INCOMPLETE_IMPORT_DISCLAIMER}
                </Banner>
            ) : null}

            {bootstrapWarnings.length > 0 ? (
                <Banner tone="info">{bootstrapWarnings.join(" ")}</Banner>
            ) : null}
        </section>
    )
}
