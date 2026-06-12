import { ChevronRight } from "lucide-react";
import { SETUP_PATH_OPTIONS, type SetupPathId } from "@knotcms/shared";
import type {
  DataSourceSummary,
  FramerCollectionSummary,
} from "../../../lib/api";
import { ConnectorLogo } from "../../../components/brand";
import { Banner, Button, Field, Input, Spinner } from "../../../components/ui";
import { ConnectStep } from "../connectors/ConnectStep";
import type { ConnectorId } from "../connectors/types";

const INCOMPLETE_IMPORT_DISCLAIMER =
  "KnotCMS syncs from Notion to Framer. If you import fewer rows than your Framer collection has, Notion starts with partial content — Framer rows you skip will disappear from your synced collection on the next sync until you add or import them in Notion.";

interface NotionStepProps {
  path: SetupPathId | null;
  setupSessionId: string | null;
  sources: DataSourceSummary[];
  selectedFramerCollection: FramerCollectionSummary | null;
  importRowMax: number;
  importRowCount: number;
  bootstrapWarnings: string[];
  busy: boolean;
  awaitingConnectorId: ConnectorId | null;
  onPathChange: (path: SetupPathId) => void;
  onConnect: (connectorId: ConnectorId) => void;
  onConnectInTab: (connectorId: ConnectorId) => void;
  onImportRowCountChange: (count: number) => void;
  onSelectAllImportRows: () => void;
  onBootstrapDatabase: () => void;
  onSelectExistingSource: (source: DataSourceSummary) => void;
  onBack: () => void;
}

export function NotionStep({
  path,
  setupSessionId,
  sources,
  selectedFramerCollection,
  importRowMax,
  importRowCount,
  bootstrapWarnings,
  busy,
  awaitingConnectorId,
  onPathChange,
  onConnect,
  onConnectInTab,
  onImportRowCountChange,
  onSelectAllImportRows,
  onBootstrapDatabase,
  onSelectExistingSource,
  onBack,
}: NotionStepProps) {
  const activePath =
    SETUP_PATH_OPTIONS.find((option) => option.id === path) ?? null;
  const needsFramerCollection = activePath?.requiresFramerCollection ?? false;
  const missingFramerCollection =
    needsFramerCollection && !selectedFramerCollection;
  const framerRowTotal = selectedFramerCollection?.itemCount ?? 0;
  const maxImportRows = Math.min(framerRowTotal, importRowMax);
  const showImportDisclaimer = importRowCount > 0;

  return (
    <div className="pf-setup-step">
      <header className="pf-setup-step-header">
        <p className="pf-eyebrow">Step 2 · Notion</p>
        <h2 className="pf-setup-step-title">
          Connect Notion and choose your path
        </h2>
        <p className="pf-setup-step-desc">
          Authorize Notion, then tell KnotCMS how to link it with your Framer
          project.
        </p>
      </header>

      <section className="pf-setup-section">
        <div className="pf-setup-section-head">
          <h3 className="pf-setup-section-title">What do you want to do?</h3>
        </div>

        <div className="pf-path-list">
          {SETUP_PATH_OPTIONS.map((option) => {
            const selected = path === option.id;
            const blocked =
              option.requiresFramerCollection && !selectedFramerCollection;
            return (
              <button
                key={option.id}
                type="button"
                className={`pf-path-option${selected ? " pf-path-option--selected" : ""}`}
                onClick={() => onPathChange(option.id)}
              >
                <span className="pf-path-option-copy">
                  <span className="pf-path-option-title">{option.title}</span>
                  <span className="pf-path-option-desc">
                    {option.description}
                  </span>
                  {blocked ? (
                    <span className="pf-path-option-hint">
                      Select a Framer collection in step 1, or go back and pick
                      one.
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {!path ? null : missingFramerCollection ? (
        <Banner tone="info">
          Go back to step 1 and select a Framer CMS collection for this path.
        </Banner>
      ) : !setupSessionId ? (
        <ConnectStep
          busy={busy}
          awaitingConnectorId={awaitingConnectorId}
          connectorIds={["notion"]}
          hideFooter
          infoMessage="Connect Notion so KnotCMS can create a database in your workspace."
          onConnect={onConnect}
          onConnectInTab={onConnectInTab}
        />
      ) : path === "framer_to_notion" ? (
        <section className="pf-setup-section">
          <div className="pf-setup-section-head">
            <h3 className="pf-setup-section-title">Create Notion database</h3>
            <p className="pf-setup-section-desc">
              KnotCMS will create a new Notion page and database from{" "}
              <strong>{selectedFramerCollection?.name}</strong>.
              {selectedFramerCollection?.managedBy === "anotherPlugin"
                ? " Because this collection is owned by another plugin, KnotCMS will sync to a new managed Framer collection (· KnotCMS)."
                : " Notion will sync back into this same Framer CMS collection."}
            </p>
          </div>

          {selectedFramerCollection &&
          !selectedFramerCollection.bootstrapPreview.eligible ? (
            <Banner tone="error">
              {selectedFramerCollection.bootstrapPreview.ineligibleReason ??
                "This collection cannot be used as a Notion template."}
            </Banner>
          ) : null}

          {selectedFramerCollection?.bootstrapPreview.warnings.length ? (
            <Banner tone="info">
              {selectedFramerCollection.bootstrapPreview.skippedFieldCount}{" "}
              field
              {selectedFramerCollection.bootstrapPreview.skippedFieldCount === 1
                ? ""
                : "s"}{" "}
              will not map to Notion in v1 (images, references, etc.).
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
                onChange={(e) => {
                  const next = Number.parseInt(e.target.value, 10);
                  onImportRowCountChange(
                    Number.isNaN(next)
                      ? 0
                      : Math.max(0, Math.min(next, maxImportRows)),
                  );
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
      ) : (
        <section className="pf-setup-section">
          <div className="pf-setup-section-head">
            <h3 className="pf-setup-section-title">Choose Notion database</h3>
            <p className="pf-setup-section-desc">
              {path === "connect_existing"
                ? "Pick the Notion database to connect with your Framer collection. KnotCMS syncs into a new managed Framer CMS collection."
                : "Pick the Notion database KnotCMS should sync to a new Framer CMS collection."}
            </p>
          </div>

          {busy && sources.length === 0 ? (
            <Spinner label="Loading databases…" />
          ) : (
            <div className="pf-data-panel">
              <ul className="pf-select-list pf-select-list--flush">
                {sources.map((source) => (
                  <li key={source.id}>
                    <button
                      type="button"
                      className="pf-select-row"
                      onClick={() => void onSelectExistingSource(source)}
                      disabled={busy}
                    >
                      <span className="pf-select-row-main">
                        <ConnectorLogo id="notion" size={18} />
                        <span className="pf-select-row-title">
                          {source.title}
                        </span>
                      </span>
                      <ChevronRight
                        size={16}
                        className="pf-select-row-chevron"
                        aria-hidden
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <footer className="pf-setup-footer pf-setup-footer--split">
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
        {path === "framer_to_notion" &&
        setupSessionId &&
        selectedFramerCollection?.bootstrapPreview.eligible ? (
          <Button onClick={() => void onBootstrapDatabase()} disabled={busy}>
            {busy ? "Creating…" : "Create Notion database"}
          </Button>
        ) : null}
      </footer>
    </div>
  );
}
