import { z } from "zod";
import { BOOTSTRAP_IMPORT_ROW_MAX } from "./framer-to-notion-import.js";
import type { FramerSyncTarget } from "./framer-sync-target.js";
import type { FieldMapping } from "./types.js";
import { FramerApiKeySchema, FramerProjectUrlSchema } from "./types.js";

/** How the user wants to connect Framer and Notion in setup. */
export type SetupPathId =
  | "framer_to_notion"
  | "connect_existing"
  | "notion_to_framer";

export const SETUP_PATH_OPTIONS: Array<{
  id: SetupPathId;
  title: string;
  description: string;
  requiresFramerCollection: boolean;
}> = [
  {
    id: "framer_to_notion",
    title: "Create new Notion database using an existing Framer CMS collection",
    description:
      "Create a Notion database from your Framer CMS collection, this keeps your  Framer CMS in synced to edits made in the Notion database going forward.",
    requiresFramerCollection: true,
  },
  {
    id: "connect_existing",
    title: "Connect existing databases",
    description:
      "You already have Notion and Framer CMS — map them and sync into your selected collection.",
    requiresFramerCollection: true,
  },
  {
    id: "notion_to_framer",
    title:
      "Create a new Framer CMS collection and sync with existing Notion database",
    description:
      "Pick a Notion database and KnotCMS creates a new synced Framer CMS collection.",
    requiresFramerCollection: false,
  },
];

export const BootstrapNotionDatabaseSchema = z.object({
  setupSessionId: z.string().uuid(),
  framerProjectUrl: FramerProjectUrlSchema,
  framerApiKey: FramerApiKeySchema,
  framerCollectionId: z.string().min(1),
  /** When omitted, KnotCMS creates a workspace page and nests the database inside it. */
  parentPageId: z.string().trim().min(1).optional(),
  databaseTitle: z.string().trim().max(120).optional(),
  importRowCount: z
    .number()
    .int()
    .min(0)
    .max(BOOTSTRAP_IMPORT_ROW_MAX)
    .default(0),
});
export type BootstrapNotionDatabaseInput = z.infer<
  typeof BootstrapNotionDatabaseSchema
>;

export const SearchNotionPagesSchema = z.object({
  setupSessionId: z.string().uuid(),
  query: z.string().max(200).optional().default(""),
});
export type SearchNotionPagesInput = z.infer<typeof SearchNotionPagesSchema>;

export interface BootstrapNotionDatabaseResponse {
  databaseId: string;
  dataSourceId: string;
  title: string;
  properties: Array<{ id: string; name: string; type: string }>;
  fieldMappings: FieldMapping[];
  warnings: string[];
  itemsImported: number;
  itemsSkipped: number;
  importWarnings: string[];
  framerSyncTarget: FramerSyncTarget;
  /** True when returning a previously created database for this wizard session. */
  fromCache?: boolean;
}

export const ImportFromFramerSchema = z.object({
  framerCollectionId: z.string().min(1).optional(),
});
export type ImportFromFramerInput = z.infer<typeof ImportFromFramerSchema>;

export interface ImportFromFramerResponse {
  imported: number;
  skipped: number;
  warnings: string[];
}
