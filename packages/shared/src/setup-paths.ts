import { z } from "zod"
import type { FramerSyncTarget } from "./framer-sync-target.js"
import type { FieldMapping } from "./types.js"
import { FramerApiKeySchema, FramerProjectUrlSchema } from "./types.js"

/** How the user wants to connect Framer and Notion in setup. */
export type SetupPathId = "framer_to_notion" | "connect_existing" | "notion_to_framer"

export const SETUP_PATH_OPTIONS: Array<{
    id: SetupPathId
    title: string
    description: string
    requiresFramerCollection: boolean
}> = [
    {
        id: "framer_to_notion",
        title: "Create Notion from Framer",
        description: "Use a Framer CMS collection as the template for a new Notion database.",
        requiresFramerCollection: true,
    },
    {
        id: "connect_existing",
        title: "Connect existing databases",
        description: "You already have Notion and Framer CMS — map them and sync into your selected collection.",
        requiresFramerCollection: true,
    },
    {
        id: "notion_to_framer",
        title: "Sync Notion to Framer",
        description: "Pick a Notion database and KnotCMS creates a new synced Framer CMS collection.",
        requiresFramerCollection: false,
    },
]

export const BootstrapNotionDatabaseSchema = z.object({
    setupSessionId: z.string().uuid(),
    framerProjectUrl: FramerProjectUrlSchema,
    framerApiKey: FramerApiKeySchema,
    framerCollectionId: z.string().min(1),
    parentPageId: z.string().trim().min(1),
    databaseTitle: z.string().trim().max(120).optional(),
})
export type BootstrapNotionDatabaseInput = z.infer<typeof BootstrapNotionDatabaseSchema>

export const SearchNotionPagesSchema = z.object({
    setupSessionId: z.string().uuid(),
    query: z.string().max(200).optional().default(""),
})
export type SearchNotionPagesInput = z.infer<typeof SearchNotionPagesSchema>

export interface BootstrapNotionDatabaseResponse {
    databaseId: string
    dataSourceId: string
    title: string
    properties: Array<{ id: string; name: string; type: string }>
    fieldMappings: FieldMapping[]
    warnings: string[]
    itemsImported: number
    itemsSkipped: number
    importWarnings: string[]
    framerSyncTarget: FramerSyncTarget
}
