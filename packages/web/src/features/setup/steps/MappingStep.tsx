import type { FieldMapping, PublishMode } from "@notion-framer/shared"
import type { DataSourceSummary } from "../../../lib/api"
import {
    Button,
    Card,
    CardHeader,
    CheckboxRow,
    Field,
    Input,
    Select,
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
    onSlugChange: (id: string) => void
    onFramerUrlChange: (url: string) => void
    onFramerKeyChange: (key: string) => void
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
    onSlugChange,
    onFramerUrlChange,
    onFramerKeyChange,
    onAutoSyncChange,
    onAutoPublishChange,
    onPublishModeChange,
    onToggleIgnored,
    onFieldNameChange,
    onBack,
    onSubmit,
}: MappingStepProps) {
    return (
        <Card>
            <CardHeader
                eyebrow="Step 3"
                title="Map fields"
                description={
                    <>
                        Map Notion properties to Framer CMS for <strong>{source.title}</strong>.
                    </>
                }
            />

            <div className="pf-mapping-grid">
                {mappings.map(mapping => (
                    <div key={mapping.notionPropertyId} className="pf-mapping-row">
                        <label className="pf-mapping-label">
                            <input
                                type="checkbox"
                                checked={!ignored.has(mapping.notionPropertyId)}
                                onChange={() => onToggleIgnored(mapping.notionPropertyId)}
                            />
                            {mapping.notionPropertyName}
                        </label>
                        <span className="pf-mapping-arrow" aria-hidden>
                            →
                        </span>
                        <Input
                            disabled={ignored.has(mapping.notionPropertyId)}
                            value={mapping.framerFieldName}
                            onChange={e => onFieldNameChange(mapping.notionPropertyId, e.target.value)}
                        />
                    </div>
                ))}
            </div>

            <hr className="pf-divider" />

            <p className="pf-eyebrow">Framer connection</p>

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

            <Field label="Framer Server API key" htmlFor="framer-key">
                <Input
                    id="framer-key"
                    type="password"
                    value={framerApiKey}
                    onChange={e => onFramerKeyChange(e.target.value)}
                />
            </Field>

            <hr className="pf-divider" />

            <p className="pf-eyebrow">Automation</p>

            <CheckboxRow checked={autoSync} onChange={onAutoSyncChange}>
                Auto-sync on Notion changes
            </CheckboxRow>
            <CheckboxRow checked={autoPublish} onChange={onAutoPublishChange}>
                Auto-publish after sync
            </CheckboxRow>

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

            <div className="pf-actions">
                <Button onClick={() => void onSubmit()} disabled={busy}>
                    {busy ? "Creating…" : "Create & sync"}
                </Button>
                <Button variant="secondary" onClick={onBack}>
                    Back
                </Button>
            </div>
        </Card>
    )
}
