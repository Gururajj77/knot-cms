import { type FieldMapping, type PublishMode, defaultFramerTypeForNotion } from "@notion-framer/shared"
import { framer, type ManagedCollection, type ManagedCollectionFieldInput } from "framer-plugin"
import { useCallback, useEffect, useMemo, useState } from "react"
import { createProject, verifyLicense } from "./api"
import {
    formatSyncResult,
    mappingsToManagedFields,
    type NotionDataSourceConfig,
    PLUGIN_KEYS,
    propertiesToFieldMappings,
    syncCollectionFromWorker,
} from "./data"

interface FieldMappingRowProps {
    field: ManagedCollectionFieldInput
    originalFieldName: string | undefined
    isIgnored: boolean
    onToggleDisabled: (fieldId: string) => void
    onNameChange: (fieldId: string, name: string) => void
}

function FieldMappingRow({
    field,
    originalFieldName,
    isIgnored,
    onToggleDisabled,
    onNameChange,
}: FieldMappingRowProps) {
    return (
        <>
            <button
                type="button"
                className={`source-field ${isIgnored ? "ignored" : ""}`}
                onClick={() => onToggleDisabled(field.id)}
            >
                <input type="checkbox" checked={!isIgnored} tabIndex={-1} readOnly />
                <span>{originalFieldName ?? field.id}</span>
            </button>
            <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" fill="none">
                <title>maps to</title>
                <path
                    fill="transparent"
                    stroke="#999"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="m2.5 7 3-3-3-3"
                />
            </svg>
            <input
                type="text"
                disabled={isIgnored}
                placeholder={field.id}
                value={field.name}
                onChange={event => onNameChange(field.id, event.target.value)}
            />
        </>
    )
}

interface FieldMappingProps {
    collection: ManagedCollection
    dataSource: NotionDataSourceConfig
    setupSessionId: string
    initialSlugFieldId: string | null
    existingProjectId: string | null
}

export function FieldMapping({
    collection,
    dataSource,
    setupSessionId,
    initialSlugFieldId,
    existingProjectId,
}: FieldMappingProps) {
    const [status, setStatus] = useState<"mapping-fields" | "syncing-collection">("mapping-fields")
    const [fields, setFields] = useState<ManagedCollectionFieldInput[]>(() =>
        mappingsToManagedFields(propertiesToFieldMappings(dataSource.properties))
    )
    const [ignoredFieldIds, setIgnoredFieldIds] = useState<ReadonlySet<string>>(new Set())
    const [mappings, setMappings] = useState<FieldMapping[]>(() =>
        propertiesToFieldMappings(dataSource.properties)
    )

    const [framerProjectUrl, setFramerProjectUrl] = useState("")
    const [framerApiKey, setFramerApiKey] = useState("")
    const [licenseKey, setLicenseKey] = useState("")
    const [autoSync, setAutoSync] = useState(true)
    const [autoPublish, setAutoPublish] = useState(true)
    const [publishMode, setPublishMode] = useState<PublishMode>("deploy_live")

    const possibleSlugFields = useMemo(
        () => dataSource.properties.filter(p => defaultFramerTypeForNotion(p.type) === "string" || p.type === "title"),
        [dataSource.properties]
    )

    const [selectedSlugPropertyId, setSelectedSlugPropertyId] = useState(
        initialSlugFieldId ?? possibleSlugFields[0]?.id ?? ""
    )

    const isSyncing = status === "syncing-collection"

    useEffect(() => {
        const initialMappings = propertiesToFieldMappings(dataSource.properties)
        setMappings(initialMappings)
        setFields(mappingsToManagedFields(initialMappings))
    }, [dataSource.properties])

    const changeFieldName = useCallback((fieldId: string, name: string) => {
        setFields(prev => prev.map(f => (f.id === fieldId ? { ...f, name } : f)))
        setMappings(prev => prev.map(m => (m.framerFieldId === fieldId ? { ...m, framerFieldName: name } : m)))
    }, [])

    const toggleFieldDisabledState = useCallback((fieldId: string) => {
        setIgnoredFieldIds(prev => {
            const next = new Set(prev)
            if (next.has(fieldId)) next.delete(fieldId)
            else next.add(fieldId)
            setMappings(mappingsPrev =>
                mappingsPrev.map(m => (m.framerFieldId === fieldId ? { ...m, ignored: next.has(fieldId) } : m))
            )
            return next
        })
    }, [])

    const savePluginData = async (projectId: string) => {
        await collection.setPluginData(PLUGIN_KEYS.PROJECT_ID, projectId)
        await collection.setPluginData(PLUGIN_KEYS.DATA_SOURCE_ID, dataSource.id)
        await collection.setPluginData(PLUGIN_KEYS.SLUG_FIELD_ID, selectedSlugPropertyId)
        await collection.setPluginData(PLUGIN_KEYS.COLLECTION_NAME, dataSource.title)
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        if (!selectedSlugPropertyId) {
            framer.notify("Select a slug field.", { variant: "warning" })
            return
        }
        if (!framerProjectUrl.trim() || !framerApiKey.trim() || !licenseKey.trim()) {
            framer.notify("Project URL, API key, and license are required.", { variant: "warning" })
            return
        }

        try {
            setStatus("syncing-collection")

            const license = await verifyLicense(licenseKey.trim(), framerProjectUrl.trim())
            if (!license.valid) {
                framer.notify(license.reason ?? "Invalid license", { variant: "error" })
                return
            }

            const activeMappings = mappings.map(m => ({
                ...m,
                ignored: ignoredFieldIds.has(m.framerFieldId),
                framerFieldName: fields.find(f => f.id === m.framerFieldId)?.name.trim() || m.framerFieldName,
            }))

            let projectId = existingProjectId
            if (!projectId) {
                const created = await createProject({
                    setupSessionId,
                    framerProjectUrl: framerProjectUrl.trim(),
                    notionDataSourceId: dataSource.id,
                    notionDatabaseId: dataSource.databaseId,
                    notionDataSourceTitle: dataSource.title,
                    slugNotionPropertyId: selectedSlugPropertyId,
                    licenseKey: licenseKey.trim(),
                    framerApiKey: framerApiKey.trim(),
                    autoSync,
                    autoPublish,
                    publishMode,
                    fieldMappings: activeMappings,
                })
                projectId = created.projectId

                if (created.sync && created.sync.itemsSynced > 0) {
                    await savePluginData(projectId)
                    framer.closePlugin(
                        formatSyncResult(created.sync, dataSource.title) +
                            " Open the “" +
                            dataSource.title +
                            "” CMS collection in Framer.",
                        { variant: "success" }
                    )
                    return
                }
            }

            if (!projectId) return

            await savePluginData(projectId)

            const result = await syncCollectionFromWorker(projectId)
            framer.closePlugin(
                formatSyncResult(result, dataSource.title) +
                    " Open the “" +
                    dataSource.title +
                    "” CMS collection in Framer.",
                { variant: "success" }
            )
        } catch (error) {
            console.error(error)
            const msg = error instanceof Error ? error.message : "Setup failed"
            framer.notify(msg, { variant: "error", durationMs: 10000 })
        } finally {
            setStatus("mapping-fields")
        }
    }

    return (
        <main className="framer-hide-scrollbar mapping">
            <hr className="sticky-divider" />
            <form onSubmit={handleSubmit}>
                <p className="mapping-hint">
                    Sync writes to a CMS collection named <strong>{dataSource.title}</strong> via the Server API.
                    The empty collection Framer created for this plugin slot is not used for data.
                </p>
                <section className="config-section">
                    <label>
                        Framer project URL
                        <input
                            type="url"
                            placeholder="https://framer.com/projects/..."
                            value={framerProjectUrl}
                            onChange={e => setFramerProjectUrl(e.target.value)}
                            required
                        />
                    </label>
                    <label>
                        Server API key
                        <input
                            type="password"
                            placeholder="From Site Settings → General"
                            value={framerApiKey}
                            onChange={e => setFramerApiKey(e.target.value)}
                            required
                        />
                    </label>
                    <label>
                        License key
                        <input type="text" value={licenseKey} onChange={e => setLicenseKey(e.target.value)} required />
                    </label>
                    <label className="checkbox-row">
                        <input type="checkbox" checked={autoSync} onChange={e => setAutoSync(e.target.checked)} />
                        Auto-sync on Notion changes
                    </label>
                    <label className="checkbox-row">
                        <input type="checkbox" checked={autoPublish} onChange={e => setAutoPublish(e.target.checked)} />
                        Auto-publish after sync
                    </label>
                    {autoPublish && (
                        <label>
                            Publish mode
                            <select value={publishMode} onChange={e => setPublishMode(e.target.value as PublishMode)}>
                                <option value="preview_only">Preview only</option>
                                <option value="deploy_live">Deploy to live site</option>
                            </select>
                        </label>
                    )}
                </section>

                <label className="slug-field" htmlFor="slugField">
                    Slug field
                    <select
                        id="slugField"
                        required
                        value={selectedSlugPropertyId}
                        onChange={e => setSelectedSlugPropertyId(e.target.value)}
                    >
                        {possibleSlugFields.map(f => (
                            <option key={f.id} value={f.id}>
                                {f.name}
                            </option>
                        ))}
                    </select>
                </label>

                <div className="fields">
                    <span className="fields-column">Notion</span>
                    <span>Framer</span>
                    {fields.map(field => (
                        <FieldMappingRow
                            key={field.id}
                            field={field}
                            originalFieldName={dataSource.properties.find(p => p.id === field.id)?.name}
                            isIgnored={ignoredFieldIds.has(field.id)}
                            onToggleDisabled={toggleFieldDisabledState}
                            onNameChange={changeFieldName}
                        />
                    ))}
                </div>

                <footer>
                    <hr />
                    <button type="submit" disabled={isSyncing}>
                        {isSyncing ? <div className="framer-spinner" /> : `Connect ${dataSource.title}`}
                    </button>
                </footer>
            </form>
        </main>
    )
}
