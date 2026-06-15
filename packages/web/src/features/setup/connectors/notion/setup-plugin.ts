import { getSetupPathOptions, propertiesToFieldMappings, type FieldMapping } from "@knotcms/shared"
import { bootstrapDashboardNotionDatabase } from "../../../../lib/api"
import type { SetupWizardPlugin } from "../setup-plugin"

const INCOMPLETE_IMPORT_DISCLAIMER =
    "KnotCMS syncs from Notion to Framer. If you import fewer rows than your Framer collection has, Notion starts with partial content — skipped Framer rows stay in your collection but won't update from Notion until you import or add matching pages there."

export const notionSetupPlugin: SetupWizardPlugin = {
    connectorId: "notion",
    sourceProvider: "notion",
    logoId: "notion",

    providerLabel: "Notion",
    sourceItemLabel: "Notion database",
    changesLabel: "Notion",
    columnLabel: "Notion",
    connectInfoMessage: "Connect Notion so KnotCMS can read your workspace databases.",
    sourcesLoadingLabel: "Loading databases…",

    getPathOptions: () => getSetupPathOptions("notion"),

    shouldLoadSources: path => Boolean(path && path !== "framer_to_notion"),

    supportsBootstrapPath: path => path === "framer_to_notion",

    propertiesOptions: () => undefined,

    pickSourceTitle: () => "Choose Notion database",

    pickSourceDescription: (path, reconfigureMode) => {
        if (reconfigureMode) {
            return "Select a different Notion database, or choose the current one to update field mapping."
        }
        if (path === "connect_existing") {
            return "Pick the Notion database to connect with your Framer collection. KnotCMS syncs into a new managed Framer CMS collection."
        }
        return "Pick the Notion database KnotCMS should sync to a new Framer CMS collection."
    },

    bootstrapFooterLabel: "Create Notion database",

    async bootstrapSource(ctx) {
        const result = await bootstrapDashboardNotionDatabase({
            setupSessionId: ctx.setupSessionId,
            framerProjectUrl: ctx.framerProjectUrl.trim(),
            framerApiKey: ctx.framerApiKey.trim(),
            framerCollectionId: ctx.framerCollectionId,
            importRowCount: ctx.importRowCount,
            databaseTitle: ctx.collectionName ?? "Notion Sync",
        })

        const importNote = result.fromCache
            ? "Using the Notion database from your earlier attempt in this session."
            : result.itemsImported > 0
              ? `Imported ${result.itemsImported} row${result.itemsImported === 1 ? "" : "s"} from Framer into Notion.`
              : ctx.importRowCount > 0
                ? "No Framer rows were imported into Notion."
                : null

        ctx.onWarnings(importNote ? [importNote, ...result.warnings] : result.warnings)

        const mappings: FieldMapping[] =
            result.fieldMappings.length > 0
                ? result.fieldMappings
                : propertiesToFieldMappings(result.properties, "notion")

        ctx.onComplete({
            source: {
                id: result.dataSourceId,
                title: result.title,
                databaseId: result.databaseId,
            },
            mappings,
            framerSyncTarget: result.framerSyncTarget,
            templateCollectionId: result.framerSyncTarget.templateCollectionId,
        })
    },
}

export { INCOMPLETE_IMPORT_DISCLAIMER }
