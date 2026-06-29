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

    pickSourceMode: "url",
    shouldLoadSources: () => false,

    supportsBootstrapPath: () => false,

    propertiesOptions: source =>
        source.databaseId ? { sheetId: source.databaseId } : undefined,

    pickSourceTitle: () => "Link your Google Sheet",

    pickSourceDescription: (path, reconfigureMode) => {
        if (reconfigureMode) {
            return "Paste the URL of a different Google Sheet, or re-use the current one to update field mapping."
        }
        if (path === "connect_existing") {
            return "Paste the Google Sheets URL you want to sync with your Framer collection."
        }
        return "Paste the Google Sheets URL KnotCMS should sync to a new Framer CMS collection."
    },
}
