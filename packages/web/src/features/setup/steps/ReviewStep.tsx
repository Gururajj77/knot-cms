import { ArrowRight, ChevronDown, Zap } from "lucide-react"
import { useEffect } from "react"
import { Link } from "react-router-dom"
import {
    isInPlaceFramerSyncMode,
    type FieldMapping,
    type FramerSyncDestination,
    type FramerSyncMode,
    type PublishMode,
    type SetupPathId,
} from "@knotcms/shared"
import type { DataSourceSummary, FramerCollectionSummary } from "../../../lib/api"
import { ROUTES } from "../../../constants/routes"
import { formatPropertyType } from "../../../lib/property-type"
import { ConnectorLogo, FramerLogo } from "../../../components/brand"
import type { ConnectorId } from "../connectors/types"
import { getSetupWizardPlugin } from "../connectors/setup-registry"
import {
    Banner,
    Button,
    CheckboxRow,
    Field,
    Input,
    Select,
    Spinner,
    ToggleRow,
} from "../../../components/ui"
import { NotionBootstrapStep } from "./notion/NotionBootstrapStep"
import { PickSourceStep } from "./PickSourceStep"
import { GoogleSheetUrlStep } from "./google-sheets/GoogleSheetUrlStep"
import { SourcePathStep } from "./SourcePathStep"
import { FramerCollectionPicker } from "./FramerCollectionPicker"

interface ReviewStepProps {
    path: SetupPathId | null
    connectorId: ConnectorId
    setupSessionId: string | null
    sources: DataSourceSummary[]
    selectedSource: DataSourceSummary | null
    selectedFramerCollection: FramerCollectionSummary | null
    mappings: FieldMapping[]
    ignored: Set<string>
    slugOptions: FieldMapping[]
    slugPropertyId: string
    autoSync: boolean
    autoPublish: boolean
    publishMode: PublishMode
    importRowMax: number
    importRowCount: number
    bootstrapWarnings: string[]
    busy: boolean
    canCreateProject: boolean
    canSync: boolean
    hasAutoSync: boolean
    hasAutoPublish: boolean
    framerSyncMode: FramerSyncMode
    selectedFramerCollectionName?: string | null
    canChooseSyncDestination?: boolean
    syncDestination?: FramerSyncDestination
    newManagedCollectionName?: string | null
    schemaWarnings?: string[]
    showAdvanced: boolean
    collections: FramerCollectionSummary[]
    collectionsLoaded: boolean
    selectedFramerCollectionId: string | null
    framerProjectUrl: string
    framerApiKey: string
    onLoadCollections: () => void
    onSelectCollection: (collectionId: string | null) => void
    onPathChange: (path: SetupPathId) => void
    onShowAdvancedChange: (show: boolean) => void
    onImportRowCountChange: (count: number) => void
    onSelectAllImportRows: () => void
    onBootstrapSource: () => void
    onSelectExistingSource: (source: DataSourceSummary) => void
    onSyncDestinationChange?: (destination: FramerSyncDestination) => void
    onSlugChange: (id: string) => void
    onAutoSyncChange: (value: boolean) => void
    onAutoPublishChange: (value: boolean) => void
    onPublishModeChange: (mode: PublishMode) => void
    onToggleIgnored: (propertyId: string) => void
    onFieldNameChange: (propertyId: string, name: string) => void
    onBack: () => void
    onSubmit: () => void
}

export function ReviewStep({
    path,
    connectorId,
    setupSessionId,
    sources,
    selectedSource,
    selectedFramerCollection,
    mappings,
    ignored,
    slugOptions,
    slugPropertyId,
    autoSync,
    autoPublish,
    publishMode,
    importRowMax,
    importRowCount,
    bootstrapWarnings,
    busy,
    canCreateProject,
    canSync,
    hasAutoSync,
    hasAutoPublish,
    framerSyncMode,
    selectedFramerCollectionName,
    canChooseSyncDestination = false,
    syncDestination = "new_managed",
    newManagedCollectionName,
    schemaWarnings = [],
    showAdvanced,
    collections,
    collectionsLoaded,
    selectedFramerCollectionId,
    framerProjectUrl,
    framerApiKey,
    onLoadCollections,
    onSelectCollection,
    onPathChange,
    onShowAdvancedChange,
    onImportRowCountChange,
    onSelectAllImportRows,
    onBootstrapSource,
    onSelectExistingSource,
    onSyncDestinationChange,
    onSlugChange,
    onAutoSyncChange,
    onAutoPublishChange,
    onPublishModeChange,
    onToggleIgnored,
    onFieldNameChange,
    onBack,
    onSubmit,
}: ReviewStepProps) {
    const plugin = getSetupWizardPlugin(connectorId)
    const sourceLabel = plugin.changesLabel
    const columnLabel = plugin.columnLabel
    const sourceLogo = plugin.logoId
    const pathOptions = plugin.getPathOptions()
    const activePath = pathOptions.find(option => option.id === path) ?? null
    const needsFramerCollection = activePath?.requiresFramerCollection ?? false
    const missingFramerCollection = needsFramerCollection && !selectedFramerCollection
    const showBootstrap =
        plugin.supportsBootstrapPath(path) && selectedFramerCollection && !missingFramerCollection
    const showPickSource =
        Boolean(path) &&
        !missingFramerCollection &&
        !plugin.supportsBootstrapPath(path) &&
        !selectedSource
    const activeCount = mappings.filter(m => !ignored.has(m.notionPropertyId)).length
    const canSubmit = Boolean(selectedSource) && activeCount > 0 && canCreateProject && canSync
    const canLoadFramer =
        framerProjectUrl.trim().length > 0 && framerApiKey.trim().length >= 8
    const showFramerCollectionPicker = needsFramerCollection || !selectedFramerCollection
    const resolvedSlugPropertyId =
        slugPropertyId || slugOptions[0]?.notionPropertyId || ""
    const selectedSlugName =
        slugOptions.find(option => option.notionPropertyId === resolvedSlugPropertyId)
            ?.notionPropertyName ?? null

    useEffect(() => {
        if (!slugPropertyId && resolvedSlugPropertyId) {
            onSlugChange(resolvedSlugPropertyId)
        }
    }, [slugPropertyId, resolvedSlugPropertyId, onSlugChange])

    return (
        <div className="pf-setup-step">
            <header className="pf-setup-step-header">
                <p className="pf-eyebrow">Step 2 · Review & sync</p>
                <h2 className="pf-setup-step-title">
                    {selectedSource ? "Review mapping and create project" : `Choose ${plugin.sourceItemLabel}`}
                </h2>
                <p className="pf-setup-step-desc">
                    {selectedSource
                        ? canChooseSyncDestination && syncDestination === "new_managed"
                            ? `KnotCMS will sync “${selectedSource.title}” into a new Framer CMS collection${newManagedCollectionName ? ` (“${newManagedCollectionName}”)` : ""}.`
                            : isInPlaceFramerSyncMode(framerSyncMode)
                              ? `KnotCMS will sync “${selectedSource.title}” into your Framer CMS collection.`
                              : `KnotCMS will sync “${selectedSource.title}” into Framer CMS.`
                        : plugin.pickSourceDescription(path ?? "notion_to_framer", false)}
                </p>
            </header>

            {showAdvanced ? (
                <details
                    className="pf-setup-advanced"
                    open={showAdvanced}
                    onToggle={event => onShowAdvancedChange((event.target as HTMLDetailsElement).open)}
                >
                    <summary className="pf-setup-advanced-summary">
                        <span>Setup path</span>
                        <ChevronDown size={16} className="pf-setup-advanced-chevron" aria-hidden />
                    </summary>
                    <div className="pf-setup-advanced-body">
                        <SourcePathStep
                            path={path}
                            pathOptions={pathOptions}
                            reconfigureMode={false}
                            embedded
                            selectedFramerCollection={selectedFramerCollection}
                            onPathChange={onPathChange}
                        />
                    </div>
                </details>
            ) : null}

            {missingFramerCollection ? (
                <Banner tone="info">
                    This setup path needs a Framer collection. Go back and open advanced options to
                    select one.
                </Banner>
            ) : null}

            {showBootstrap ? (
                <NotionBootstrapStep
                    selectedFramerCollection={selectedFramerCollection}
                    importRowMax={importRowMax}
                    importRowCount={importRowCount}
                    bootstrapWarnings={bootstrapWarnings}
                    busy={busy}
                    onImportRowCountChange={onImportRowCountChange}
                    onSelectAllImportRows={onSelectAllImportRows}
                />
            ) : null}

            {showPickSource && path && setupSessionId ? (
                plugin.pickSourceMode === "url" ? (
                    <GoogleSheetUrlStep
                        setupSessionId={setupSessionId}
                        plugin={plugin}
                        path={path}
                        busy={busy}
                        onSelectSource={onSelectExistingSource}
                    />
                ) : (
                    <PickSourceStep
                        plugin={plugin}
                        path={path}
                        sources={sources}
                        busy={busy}
                        reconfigureMode={false}
                        hideDescription
                        onSelectSource={onSelectExistingSource}
                    />
                )
            ) : null}

            {selectedSource ? (
                <div className="pf-review-panel">
                    <div className="pf-review-card">
                        <div className="pf-review-card-top">
                            <div className="pf-mapping-hero-flow">
                                <ConnectorLogo id={sourceLogo} size={20} />
                                <span className="pf-mapping-hero-line" aria-hidden />
                                <ArrowRight size={16} className="pf-mapping-hero-arrow" aria-hidden />
                                <span className="pf-mapping-hero-line" aria-hidden />
                                <FramerLogo size={20} />
                            </div>
                            <div className="pf-mapping-hero-copy">
                                <p className="pf-mapping-hero-source">{selectedSource.title}</p>
                                <p className="pf-mapping-hero-meta">
                                    {activeCount} of {mappings.length} field
                                    {activeCount === 1 ? "" : "s"} syncing
                                    {selectedSlugName ? ` · Default slug: ${selectedSlugName}` : ""}
                                </p>
                            </div>
                        </div>

                        <Field label="Slug field" htmlFor="slug">
                            <Select
                                id="slug"
                                value={resolvedSlugPropertyId}
                                onChange={e => onSlugChange(e.target.value)}
                            >
                                {slugOptions.map(m => (
                                    <option key={m.notionPropertyId} value={m.notionPropertyId}>
                                        {m.notionPropertyName}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <p className="pf-review-slug-hint">
                            Used as the URL slug for each synced page in Framer.
                        </p>
                    </div>

                    <section className="pf-setup-section">
                        <div className="pf-setup-section-head pf-setup-section-head--compact">
                            <h3 className="pf-setup-section-title">Field mapping</h3>
                            <p className="pf-setup-section-desc">
                                Turn fields on or off. Names on the right become column names in Framer
                                CMS.
                            </p>
                        </div>

                        <div className="pf-mapping-rows">
                            <div className="pf-mapping-rows-header" aria-hidden>
                                <span>{columnLabel}</span>
                                <span />
                                <span>Framer CMS</span>
                            </div>
                            {mappings.map(mapping => {
                                const isIgnored = ignored.has(mapping.notionPropertyId)
                                return (
                                    <div
                                        key={mapping.notionPropertyId}
                                        className={`pf-mapping-row${isIgnored ? " pf-mapping-row--off" : ""}`}
                                    >
                                        <label className="pf-mapping-row-source">
                                            <input
                                                type="checkbox"
                                                checked={!isIgnored}
                                                onChange={() =>
                                                    onToggleIgnored(mapping.notionPropertyId)
                                                }
                                            />
                                            <span className="pf-mapping-row-field">
                                                <span className="pf-mapping-row-name">
                                                    {mapping.notionPropertyName}
                                                </span>
                                                <span className="pf-mapping-row-type">
                                                    {formatPropertyType(mapping.notionPropertyType)}
                                                </span>
                                            </span>
                                        </label>
                                        <ArrowRight
                                            size={14}
                                            className="pf-mapping-row-arrow"
                                            aria-hidden
                                        />
                                        <Input
                                            disabled={isIgnored}
                                            value={mapping.framerFieldName}
                                            placeholder="Field name"
                                            onChange={e =>
                                                onFieldNameChange(
                                                    mapping.notionPropertyId,
                                                    e.target.value
                                                )
                                            }
                                        />
                                    </div>
                                )
                            })}
                        </div>
                    </section>

                    {showFramerCollectionPicker ? (
                        <section className="pf-setup-section">
                            <FramerCollectionPicker
                                collections={collections}
                                selectedCollectionId={selectedFramerCollectionId}
                                collectionsLoaded={collectionsLoaded}
                                busy={busy}
                                canLoad={canLoadFramer}
                                required={needsFramerCollection}
                                onLoadCollections={onLoadCollections}
                                onSelectCollection={onSelectCollection}
                            />
                        </section>
                    ) : null}

                    <details className="pf-setup-advanced">
                        <summary className="pf-setup-advanced-summary">
                            <span>
                                <Zap size={15} aria-hidden />
                                Automation & sync options
                            </span>
                            <ChevronDown size={16} className="pf-setup-advanced-chevron" aria-hidden />
                        </summary>
                        <div className="pf-setup-advanced-body">
                            {canChooseSyncDestination ? (
                                <section className="pf-sync-target-section">
                                    <div className="pf-setup-section-head">
                                        <h3 className="pf-setup-section-title">
                                            Where should {sourceLabel} sync?
                                        </h3>
                                    </div>
                                    <div
                                        className="pf-sync-target-options"
                                        role="radiogroup"
                                        aria-label="Framer sync target"
                                    >
                                        <button
                                            type="button"
                                            role="radio"
                                            aria-checked={syncDestination === "in_place"}
                                            className={`pf-sync-target-option${syncDestination === "in_place" ? " pf-sync-target-option--selected" : ""}`}
                                            onClick={() => onSyncDestinationChange?.("in_place")}
                                        >
                                            <span className="pf-sync-target-option-copy">
                                                <span className="pf-sync-target-option-title">
                                                    Update{" "}
                                                    {selectedFramerCollectionName
                                                        ? `“${selectedFramerCollectionName}”`
                                                        : "the selected collection"}
                                                </span>
                                            </span>
                                        </button>
                                        <button
                                            type="button"
                                            role="radio"
                                            aria-checked={syncDestination === "new_managed"}
                                            className={`pf-sync-target-option${syncDestination === "new_managed" ? " pf-sync-target-option--selected" : ""}`}
                                            onClick={() =>
                                                onSyncDestinationChange?.("new_managed")
                                            }
                                        >
                                            <span className="pf-sync-target-option-copy">
                                                <span className="pf-sync-target-option-title">
                                                    Create{" "}
                                                    {newManagedCollectionName
                                                        ? `“${newManagedCollectionName}”`
                                                        : "a new collection"}
                                                </span>
                                            </span>
                                        </button>
                                    </div>
                                    {syncDestination === "in_place" && schemaWarnings.length > 0 ? (
                                        <ul className="pf-sync-target-notes">
                                            {schemaWarnings.map(warning => (
                                                <li key={warning}>{warning}</li>
                                            ))}
                                        </ul>
                                    ) : null}
                                </section>
                            ) : null}

                            <CheckboxRow
                                checked={autoSync && hasAutoSync}
                                disabled={!hasAutoSync}
                                onChange={onAutoSyncChange}
                            >
                                Auto-sync on {sourceLabel} changes
                            </CheckboxRow>
                            {!hasAutoSync ? (
                                <p className="pf-plan-gate-hint">
                                    Not on your plan.{" "}
                                    <Link to={ROUTES.plans} className="pf-banner-link">
                                        View plans
                                    </Link>
                                </p>
                            ) : null}
                            <ToggleRow
                                label="Auto-publish after sync"
                                description="Publish or preview your Framer site when a sync finishes."
                                checked={autoPublish && hasAutoPublish}
                                disabled={!hasAutoPublish}
                                onChange={onAutoPublishChange}
                            />
                            {!hasAutoPublish ? (
                                <p className="pf-plan-gate-hint">
                                    Not on your plan.{" "}
                                    <Link to={ROUTES.plans} className="pf-banner-link">
                                        View plans
                                    </Link>
                                </p>
                            ) : null}
                            {autoPublish ? (
                                <Field
                                    label="Publish mode"
                                    htmlFor="publish-mode"
                                    className="pf-field--spaced"
                                >
                                    <Select
                                        id="publish-mode"
                                        value={publishMode}
                                        onChange={e =>
                                            onPublishModeChange(e.target.value as PublishMode)
                                        }
                                    >
                                        <option value="deploy_live">Deploy to live site</option>
                                        <option value="preview_only">Preview only</option>
                                    </Select>
                                </Field>
                            ) : null}
                        </div>
                    </details>
                </div>
            ) : busy && sources.length === 0 && showPickSource ? (
                <Spinner label={plugin.sourcesLoadingLabel} />
            ) : null}

            <footer className="pf-setup-footer pf-setup-footer--split">
                <Button variant="secondary" onClick={onBack}>
                    Back
                </Button>
                <div className="pf-setup-footer-end">
                    {showBootstrap &&
                    setupSessionId &&
                    selectedFramerCollection?.bootstrapPreview.eligible ? (
                        <Button onClick={() => void onBootstrapSource()} disabled={busy}>
                            {busy ? "Creating…" : (plugin.bootstrapFooterLabel ?? "Create source")}
                        </Button>
                    ) : selectedSource ? (
                        <>
                            {!canCreateProject && !busy ? (
                                <span className="pf-setup-footer-hint">
                                    Project limit reached —{" "}
                                    <Link to={ROUTES.plans} className="pf-banner-link">
                                        open profile
                                    </Link>
                                </span>
                            ) : !canSync && !busy ? (
                                <span className="pf-setup-footer-hint">
                                    No syncs left —{" "}
                                    <Link to={ROUTES.plans} className="pf-banner-link">
                                        open profile
                                    </Link>
                                </span>
                            ) : !canSubmit && !busy ? (
                                <span className="pf-setup-footer-hint">
                                    Turn on at least one field to continue
                                </span>
                            ) : null}
                            <Button onClick={() => void onSubmit()} disabled={busy || !canSubmit}>
                                {busy ? "Creating…" : "Create & sync"}
                            </Button>
                        </>
                    ) : null}
                </div>
            </footer>
        </div>
    )
}
