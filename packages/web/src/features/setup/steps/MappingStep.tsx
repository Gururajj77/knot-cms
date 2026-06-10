import { ArrowRight, Check, Zap } from "lucide-react"
import { Link } from "react-router-dom"
import type { FieldMapping, PublishMode } from "@nocms/shared"
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
    framerProjectUrl: string
    framerApiKey: string
    autoSync: boolean
    autoPublish: boolean
    publishMode: PublishMode
    busy: boolean
    framerVerified: boolean
    testingFramer: boolean
    canCreateProject: boolean
    canSync: boolean
    hasAutoSync: boolean
    hasAutoPublish: boolean
    onSlugChange: (id: string) => void
    onFramerUrlChange: (url: string) => void
    onFramerKeyChange: (key: string) => void
    onTestFramer: () => void
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
    framerProjectUrl,
    framerApiKey,
    autoSync,
    autoPublish,
    publishMode,
    busy,
    framerVerified,
    testingFramer,
    canCreateProject,
    canSync,
    hasAutoSync,
    hasAutoPublish,
    onSlugChange,
    onFramerUrlChange,
    onFramerKeyChange,
    onTestFramer,
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
                <h2 className="pf-setup-step-title">Wire up your pipeline</h2>
                <p className="pf-setup-step-desc">
                    Map fields, connect Framer, and you&apos;re live. Most of this is pre-filled for you.
                </p>
            </header>

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
                        {activeCount} of {mappings.length} fields syncing
                    </p>
                </div>
            </div>

            <section className="pf-setup-section">
                <div className="pf-setup-section-head">
                    <h3 className="pf-setup-section-title">Field mapping</h3>
                    <p className="pf-setup-section-desc">
                        Toggle fields you want. Names on the right become Framer CMS columns.
                    </p>
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

            <section className="pf-setup-section pf-setup-section--accent">
                <div className="pf-setup-section-head">
                    <h3 className="pf-setup-section-title">Framer connection</h3>
                    <p className="pf-setup-section-desc">
                        Your project URL and Server API key. Encrypted at rest — never shown again.
                    </p>
                </div>

                <div className="pf-form-grid">
                    <Field label="Slug field" htmlFor="slug">
                        <Select id="slug" value={slugPropertyId} onChange={e => onSlugChange(e.target.value)}>
                            {slugOptions.map(m => (
                                <option key={m.notionPropertyId} value={m.notionPropertyId}>
                                    {m.notionPropertyName}
                                </option>
                            ))}
                        </Select>
                    </Field>

                    <Field label="Framer project URL" htmlFor="framer-url">
                        <Input
                            id="framer-url"
                            placeholder="https://framer.com/projects/..."
                            value={framerProjectUrl}
                            onChange={e => onFramerUrlChange(e.target.value)}
                        />
                    </Field>

                    <Field label="Server API key" htmlFor="framer-key">
                        <Input
                            id="framer-key"
                            type="password"
                            autoComplete="off"
                            value={framerApiKey}
                            onChange={e => onFramerKeyChange(e.target.value)}
                        />
                    </Field>
                </div>

                <div className="pf-mapping-framer-actions">
                    <Button
                        variant="secondary"
                        onClick={() => void onTestFramer()}
                        disabled={busy || testingFramer || !framerProjectUrl.trim() || !framerApiKey.trim()}
                    >
                        {testingFramer ? "Testing…" : "Test connection"}
                    </Button>
                    {framerVerified ? (
                        <span className="pf-inline-ok">
                            <Check size={15} aria-hidden />
                            Connected
                        </span>
                    ) : (
                        <span className="pf-muted">Required before first sync</span>
                    )}
                </div>
            </section>

            <section className="pf-setup-section">
                <div className="pf-setup-section-head">
                    <h3 className="pf-setup-section-title">
                        <Zap size={16} aria-hidden />
                        Automation
                    </h3>
                    <p className="pf-setup-section-desc">
                        Keep Framer in sync when Notion changes, and optionally publish after each sync.
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
                        <Link to={ROUTES.subscribe} className="pf-banner-link">
                            Upgrade for auto-sync
                        </Link>
                    </p>
                ) : null}
                <ToggleRow
                    label="Auto-publish after sync"
                    description="Deploy or preview your Framer site when CMS sync completes."
                    checked={autoPublish && hasAutoPublish}
                    disabled={!hasAutoPublish}
                    onChange={onAutoPublishChange}
                />
                {!hasAutoPublish ? (
                    <p className="pf-plan-gate-hint">
                        Not on your plan.{" "}
                        <Link to={ROUTES.subscribe} className="pf-banner-link">
                            Upgrade for auto-publish
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
                            <Link to={ROUTES.subscribe} className="pf-banner-link">
                                upgrade
                            </Link>
                        </span>
                    ) : !canSync && !busy ? (
                        <span className="pf-setup-footer-hint">
                            No syncs left —{" "}
                            <Link to={ROUTES.subscribe} className="pf-banner-link">
                                upgrade
                            </Link>
                        </span>
                    ) : !canSubmit && !busy ? (
                        <span className="pf-setup-footer-hint">Select at least one field</span>
                    ) : !framerVerified && !busy ? (
                        <span className="pf-setup-footer-hint">Test connection recommended</span>
                    ) : null}
                    <Button onClick={() => void onSubmit()} disabled={busy || !canSubmit}>
                        {busy ? "Creating…" : "Create & sync"}
                    </Button>
                </div>
            </footer>
        </div>
    )
}
