import { useState } from "react"
import type { SetupPathId } from "@knotcms/shared"
import {
    resolveGoogleSheetUrl,
    type DataSourceSummary,
    type GoogleSheetResolveResult,
} from "../../../../lib/api"
import { apiErrorMessage } from "../../../../lib/api-errors"
import { ConnectorLogo } from "../../../../components/brand"
import { Banner, Button, Field, Input, Select, Spinner } from "../../../../components/ui"
import type { SetupWizardPlugin } from "../../connectors/setup-plugin"

interface GoogleSheetUrlStepProps {
    setupSessionId: string
    plugin: SetupWizardPlugin
    path: SetupPathId
    busy: boolean
    onSelectSource: (source: DataSourceSummary) => void
}

function sourceForTab(resolved: GoogleSheetResolveResult, sheetId: number): DataSourceSummary {
    const tab = resolved.tabs.find(t => t.sheetId === sheetId) ?? resolved.selectedTab
    return {
        id: resolved.spreadsheetId,
        title: `${resolved.spreadsheetTitle} / ${tab.title}`,
        databaseId: String(tab.sheetId),
    }
}

export function GoogleSheetUrlStep({
    setupSessionId,
    plugin,
    path,
    busy,
    onSelectSource,
}: GoogleSheetUrlStepProps) {
    const [sheetUrl, setSheetUrl] = useState("")
    const [resolved, setResolved] = useState<GoogleSheetResolveResult | null>(null)
    const [selectedTabId, setSelectedTabId] = useState<number | null>(null)
    const [lookupBusy, setLookupBusy] = useState(false)
    const [lookupError, setLookupError] = useState<string | null>(null)

    const handleLookup = async () => {
        const url = sheetUrl.trim()
        if (!url) {
            setLookupError("Paste your Google Sheets URL first.")
            return
        }

        setLookupBusy(true)
        setLookupError(null)
        setResolved(null)
        setSelectedTabId(null)

        try {
            const result = await resolveGoogleSheetUrl(setupSessionId, url)
            setResolved(result)
            setSelectedTabId(result.selectedTab.sheetId)
        } catch (err) {
            setLookupError(apiErrorMessage(err, "Could not load that Google Sheet."))
        } finally {
            setLookupBusy(false)
        }
    }

    const handleConfirm = () => {
        if (!resolved || selectedTabId === null) return
        void onSelectSource(sourceForTab(resolved, selectedTabId))
    }

    const selectedTab =
        resolved && selectedTabId !== null
            ? resolved.tabs.find(tab => tab.sheetId === selectedTabId) ?? resolved.selectedTab
            : null

    return (
        <section className="pf-setup-section">
            <div className="pf-setup-section-head">
                <h3 className="pf-setup-section-title">
                    <ConnectorLogo id={plugin.logoId} size={18} />
                    {plugin.pickSourceTitle(path)}
                </h3>
                <p className="pf-setup-section-desc">{plugin.pickSourceDescription(path, false)}</p>
            </div>

            <div className="pf-form-grid">
                <Field label="Google Sheets URL" htmlFor="google-sheet-url">
                    <Input
                        id="google-sheet-url"
                        placeholder="https://docs.google.com/spreadsheets/d/…/edit"
                        value={sheetUrl}
                        disabled={lookupBusy || busy}
                        onChange={e => {
                            setSheetUrl(e.target.value)
                            setResolved(null)
                            setSelectedTabId(null)
                            setLookupError(null)
                        }}
                        onKeyDown={e => {
                            if (e.key === "Enter") void handleLookup()
                        }}
                    />
                </Field>
                <p className="pf-muted">
                    Open your sheet in Google Sheets and copy the browser URL.
                </p>
            </div>

            <div className="pf-actions">
                <Button
                    variant="secondary"
                    onClick={() => void handleLookup()}
                    disabled={lookupBusy || busy || !sheetUrl.trim()}
                >
                    {lookupBusy ? "Looking up…" : "Look up sheet"}
                </Button>
            </div>

            {lookupError ? (
                <Banner tone="error" className="pf-banner--inset">
                    {lookupError}
                </Banner>
            ) : null}

            {lookupBusy ? <Spinner label="Fetching spreadsheet…" /> : null}

            {resolved && selectedTab ? (
                <>
                    <div className="pf-data-panel pf-data-panel--confirm">
                        <div className="pf-data-panel-body">
                            <div className="pf-setup-section-head pf-setup-section-head--compact">
                                <h4 className="pf-setup-section-title">{resolved.spreadsheetTitle}</h4>
                                <p className="pf-setup-section-desc">
                                    Confirm this is the sheet KnotCMS should sync.
                                </p>
                            </div>

                            {resolved.tabs.length > 1 ? (
                                <Field label="Tab" htmlFor="google-sheet-tab">
                                    <Select
                                        id="google-sheet-tab"
                                        value={String(selectedTabId ?? "")}
                                        disabled={busy}
                                        onChange={e =>
                                            setSelectedTabId(Number.parseInt(e.target.value, 10))
                                        }
                                    >
                                        {resolved.tabs.map(tab => (
                                            <option key={tab.sheetId} value={tab.sheetId}>
                                                {tab.title}
                                            </option>
                                        ))}
                                    </Select>
                                </Field>
                            ) : (
                                <p className="pf-sheet-tab-label">
                                    Tab: <strong>{selectedTab.title}</strong>
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="pf-actions">
                        <Button onClick={handleConfirm} disabled={busy}>
                            {busy ? "Loading columns…" : "Continue to mapping"}
                        </Button>
                    </div>
                </>
            ) : null}
        </section>
    )
}
