import { getSetupPathOptions } from "@knotcms/shared"
import type { SetupWizardPlugin } from "../setup-plugin"

export const googleSheetsSetupPlugin: SetupWizardPlugin = {
    connectorId: "google_sheets",
    sourceProvider: "google_sheets",
    logoId: "google_sheets",

    providerLabel: "Google Sheets",
    sourceItemLabel: "Google Sheet",
    changesLabel: "Google Sheet",
    columnLabel: "Sheet",
    connectInfoMessage: "Connect Google Sheets so KnotCMS can read your spreadsheet columns.",
    sourcesLoadingLabel: "Loading spreadsheets…",

    getPathOptions: () => getSetupPathOptions("google_sheets"),

    shouldLoadSources: path => Boolean(path),

    supportsBootstrapPath: () => false,

    propertiesOptions: source =>
        source.databaseId ? { sheetId: source.databaseId } : undefined,

    pickSourceTitle: () => "Choose Google Sheet",

    pickSourceDescription: (path, reconfigureMode) => {
        if (reconfigureMode) {
            return "Select a different Google Sheet, or choose the current one to update field mapping."
        }
        if (path === "connect_existing") {
            return "Pick the Google Sheet to connect with your Framer collection. KnotCMS syncs into a new managed Framer CMS collection."
        }
        return "Pick the Google Sheet KnotCMS should sync to a new Framer CMS collection."
    },
}
