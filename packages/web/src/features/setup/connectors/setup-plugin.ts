import type { ReactNode } from "react"
import type { SetupPathId, SetupSourceProvider } from "@knotcms/shared"
import type { ConnectorLogoId } from "../../../components/brand"
import type { DataSourceSummary, FramerCollectionSummary } from "../../../lib/api"
import type { FieldMapping, FramerSyncTarget } from "@knotcms/shared"
import type { ConnectorId } from "./types"

export type SetupPathOption = {
    id: SetupPathId
    title: string
    description: string
    requiresFramerCollection: boolean
}

export interface SourcePropertiesOptions {
    sheetId?: string
}

export interface BootstrapSourceContext {
    setupSessionId: string
    framerProjectUrl: string
    framerApiKey: string
    framerCollectionId: string
    importRowCount: number
    collectionName?: string
    onWarnings: (warnings: string[]) => void
    onComplete: (result: {
        source: DataSourceSummary
        mappings: FieldMapping[]
        framerSyncTarget?: FramerSyncTarget
        templateCollectionId?: string
    }) => void
    onError: (message: string) => void
}

/** Per-connector setup wizard behavior — paths, copy, source loading, optional bootstrap. */
export interface SetupWizardPlugin {
    connectorId: ConnectorId
    sourceProvider: SetupSourceProvider
    logoId: ConnectorLogoId

    providerLabel: string
    sourceItemLabel: string
    changesLabel: string
    columnLabel: string
    connectInfoMessage: string
    sourcesLoadingLabel: string

    getPathOptions(): SetupPathOption[]
    shouldLoadSources(path: SetupPathId | null): boolean
    supportsBootstrapPath(path: SetupPathId | null): boolean
    propertiesOptions(source: DataSourceSummary): SourcePropertiesOptions | undefined
    pickSourceTitle(path: SetupPathId): string
    pickSourceDescription(path: SetupPathId, reconfigureMode: boolean): string

    bootstrapSource?: (ctx: BootstrapSourceContext) => Promise<void>
    renderBootstrapPanel?: (props: BootstrapPanelProps) => ReactNode
    bootstrapFooterLabel?: string
}

export interface BootstrapPanelProps {
    selectedFramerCollection: FramerCollectionSummary
    importRowMax: number
    importRowCount: number
    bootstrapWarnings: string[]
    busy: boolean
    onImportRowCountChange: (count: number) => void
    onSelectAllImportRows: () => void
}
