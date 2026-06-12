import { ArrowRight, Zap } from "lucide-react"
import { Link } from "react-router-dom"
import {
    isInPlaceFramerSyncMode,
    type FieldMapping,
    type FramerSyncDestination,
    type FramerSyncMode,
    type PublishMode,
} from "@knotcms/shared"
import type { DataSourceSummary } from "../../../lib/api"
import { ROUTES } from "../../../constants/routes"
import { formatPropertyType } from "../../../lib/property-type"
import { FramerLogo, NotionLogo } from "../../../components/brand"
import {
    Button,
    CheckboxRow,
    Field,
    Input,
    Select,
    ToggleRow,
} from "../../../components/ui"

interface MappingStepProps {
    source: DataSourceSummary
    mappings: FieldMapping[]
    ignored: Set<string>
    slugOptions: FieldMapping[]
    slugPropertyId: string
    autoSync: boolean
    autoPublish: boolean
    publishMode: PublishMode
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

export function MappingStep({
    source,
    mappings,
    ignored,
    slugOptions,
    slugPropertyId,
    autoSync,
    autoPublish,
    publishMode,
    busy,
    canCreateProject,
    canSync,
    hasAutoSync,
    hasAutoPublish,
    framerSyncMode,
    selectedFramerCollectionName,
    canChooseSyncDestination = false,
    syncDestination = "in_place",
    newManagedCollectionName,
    schemaWarnings = [],
    onSyncDestinationChange,
    onSlugChange,
    onAutoSyncChange,
    onAutoPublishChange,
    onPublishModeChange,
    onToggleIgnored,
    onFieldNameChange,
    onBack,
    onSubmit,
}: MappingStepProps) {
    const activeCount = mappings.filter(m => !ignored.has(m.notionPropertyId)).length
    const canSubmit = activeCount > 0 && canCreateProject && canSync

    return (
        <div className="pf-setup-step">
            <header className="pf-setup-step-header">
                <p className="pf-eyebrow">Step 3 · Mapping</p>
                <h2 className="pf-setup-step-title">Map fields and set automation</h2>
                <p className="pf-setup-step-desc">
                    {canChooseSyncDestination && syncDestination === "new_managed"
                        ? `Changes in Notion will sync into a new KnotCMS collection${newManagedCollectionName ? ` (“${newManagedCollectionName}”)` : ""}. Your selected Framer collection stays as a template.`
                        : isInPlaceFramerSyncMode(framerSyncMode)
                          ? `Changes in Notion will sync into${selectedFramerCollectionName ? ` “${selectedFramerCollectionName}”` : " your Framer CMS collection"}.`
                          : newManagedCollectionName
                            ? `Changes in Notion will sync into a new KnotCMS collection (“${newManagedCollectionName}”).`
                            : "Changes in Notion will sync into a new KnotCMS-managed Framer collection."}
                </p>
            </header>

            {canChooseSyncDestination ? (
                <section className="pf-setup-section pf-sync-target-section">
                    <div className="pf-setup-section-head">
                        <h3 className="pf-setup-section-title">Where should Notion sync?</h3>
                        <p className="pf-setup-section-desc">
                            Update your selected Framer collection, or create a new one managed by KnotCMS.
                        </p>
                    </div>
                    <div className="pf-sync-target-options" role="radiogroup" aria-label="Framer sync target">
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
                                <span className="pf-sync-target-option-desc">
                                    Sync into your existing collection. Framer column names must match the
                                    fields you map below.
                                </span>
                            </span>
                        </button>
                        <button
                            type="button"
                            role="radio"
                            aria-checked={syncDestination === "new_managed"}
                            className={`pf-sync-target-option${syncDestination === "new_managed" ? " pf-sync-target-option--selected" : ""}`}
                            onClick={() => onSyncDestinationChange?.("new_managed")}
                        >
                            <span className="pf-sync-target-option-copy">
                                <span className="pf-sync-target-option-title">
                                    Create{" "}
                                    {newManagedCollectionName
                                        ? `“${newManagedCollectionName}”`
                                        : "a new KnotCMS collection"}
                                </span>
                                <span className="pf-sync-target-option-desc">
                                    Use your selected collection as a template only. KnotCMS creates a
                                    separate collection with columns from your Notion mapping.
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
                    {syncDestination === "new_managed" ? (
                        <p className="pf-sync-target-note pf-sync-target-note--single">
                            KnotCMS will add a new managed collection based on your Notion fields. Your
                            selected Framer collection stays unchanged.
                        </p>
                    ) : null}
                </section>
            ) : null}

            <div className="pf-mapping-hero">
                <div className="pf-mapping-hero-flow">
                    <NotionLogo size={20} />
                    <span className="pf-mapping-hero-line" aria-hidden />
                    <ArrowRight size={16} className="pf-mapping-hero-arrow" aria-hidden />
                    <span className="pf-mapping-hero-line" aria-hidden />
                    <FramerLogo size={20} />
                </div>
                <div className="pf-mapping-hero-copy">
                    <p className="pf-mapping-hero-source">{source.title}</p>
                    <p className="pf-mapping-hero-meta">
                        {activeCount} of {mappings.length} field{activeCount === 1 ? "" : "s"} syncing
                    </p>
                </div>
            </div>

            <section className="pf-setup-section">
                <div className="pf-setup-section-head">
                    <h3 className="pf-setup-section-title">Field mapping</h3>
                    <p className="pf-setup-section-desc">
                        Turn fields on or off. Names on the right become column names in Framer CMS.
                    </p>
                </div>

                <div className="pf-form-grid pf-form-grid--single">
                    <Field label="Slug field" htmlFor="slug">
                        <Select id="slug" value={slugPropertyId} onChange={e => onSlugChange(e.target.value)}>
                            {slugOptions.map(m => (
                                <option key={m.notionPropertyId} value={m.notionPropertyId}>
                                    {m.notionPropertyName}
                                </option>
                            ))}
                        </Select>
                    </Field>
                </div>

                <div className="pf-mapping-rows">
                    <div className="pf-mapping-rows-header" aria-hidden>
                        <span>Notion</span>
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
                                        onChange={() => onToggleIgnored(mapping.notionPropertyId)}
                                    />
                                    <span className="pf-mapping-row-field">
                                        <span className="pf-mapping-row-name">{mapping.notionPropertyName}</span>
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
                                        onFieldNameChange(mapping.notionPropertyId, e.target.value)
                                    }
                                />
                            </div>
                        )
                    })}
                </div>
            </section>

            <section className="pf-setup-section">
                <div className="pf-setup-section-head">
                    <h3 className="pf-setup-section-title">
                        <Zap size={16} aria-hidden />
                        Automation
                    </h3>
                    <p className="pf-setup-section-desc">
                        Sync automatically when Notion changes, and optionally publish your site after each
                        sync.
                    </p>
                </div>

                <CheckboxRow
                    checked={autoSync && hasAutoSync}
                    disabled={!hasAutoSync}
                    onChange={onAutoSyncChange}
                >
                    Auto-sync on Notion changes
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
                    <Field label="Publish mode" htmlFor="publish-mode" className="pf-field--spaced">
                        <Select
                            id="publish-mode"
                            value={publishMode}
                            onChange={e => onPublishModeChange(e.target.value as PublishMode)}
                        >
                            <option value="deploy_live">Deploy to live site</option>
                            <option value="preview_only">Preview only</option>
                        </Select>
                    </Field>
                ) : null}
            </section>

            <footer className="pf-setup-footer pf-setup-footer--split">
                <Button variant="secondary" onClick={onBack}>
                    Back
                </Button>
                <div className="pf-setup-footer-end">
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
                        <span className="pf-setup-footer-hint">Turn on at least one field to continue</span>
                    ) : null}
                    <Button onClick={() => void onSubmit()} disabled={busy || !canSubmit}>
                        {busy ? "Creating…" : "Create & sync"}
                    </Button>
                </div>
            </footer>
        </div>
    )
}
