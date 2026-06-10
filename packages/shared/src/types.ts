import { z } from "zod"
import type { SyncErrorCode } from "./errors.js"
import {
    framerProjectUrlErrorMessage,
    isAllowedFramerProjectUrl,
    normalizeFramerProjectUrl,
} from "./framer-url.js"

export const PublishModeSchema = z.enum(["preview_only", "deploy_live"])
export type PublishMode = z.infer<typeof PublishModeSchema>

export const FramerFieldTypeSchema = z.enum([
    "string",
    "number",
    "boolean",
    "formattedText",
    "date",
    "link",
    "image",
    "enum",
])
export type FramerFieldType = z.infer<typeof FramerFieldTypeSchema>

export const FieldMappingSchema = z.object({
    notionPropertyId: z.string(),
    notionPropertyName: z.string(),
    notionPropertyType: z.string(),
    framerFieldId: z.string().max(64),
    framerFieldName: z.string(),
    framerFieldType: FramerFieldTypeSchema,
    ignored: z.boolean().optional(),
    enumCaseMap: z.record(z.string(), z.string()).optional(),
    contentType: z.enum(["html", "markdown", "auto"]).optional(),
})
export type FieldMapping = z.infer<typeof FieldMappingSchema>

/** Placeholder until Server API sync resolves the real managed collection id. */
export const PENDING_FRAMER_COLLECTION_ID = "pending"

export const FramerProjectUrlSchema = z
    .string()
    .trim()
    .min(1)
    .transform(normalizeFramerProjectUrl)
    .refine(isAllowedFramerProjectUrl, framerProjectUrlErrorMessage())

export const FramerApiKeySchema = z.string().trim().min(8).max(256)

export const VerifyFramerCredentialsSchema = z.object({
    framerProjectUrl: FramerProjectUrlSchema,
    framerApiKey: FramerApiKeySchema,
})
export type VerifyFramerCredentialsInput = z.infer<typeof VerifyFramerCredentialsSchema>

export const CreateProjectSchema = z.object({
    setupSessionId: z.string().uuid(),
    framerProjectUrl: FramerProjectUrlSchema,
    framerCollectionId: z.string().optional().default(PENDING_FRAMER_COLLECTION_ID),
    notionDataSourceId: z.string(),
    notionDatabaseId: z.string().optional(),
    notionDataSourceTitle: z.string().optional(),
    slugNotionPropertyId: z.string(),
    licenseKey: z.string().min(8),
    framerApiKey: FramerApiKeySchema,
    autoSync: z.boolean().default(true),
    autoPublish: z.boolean().default(true),
    publishMode: PublishModeSchema.default("deploy_live"),
    fieldMappings: z.array(FieldMappingSchema).min(1),
})
export type CreateProjectInput = z.input<typeof CreateProjectSchema>

/** Web dashboard — subscription via Google + Polar, no license key. */
export const DashboardCreateProjectSchema = CreateProjectSchema.omit({ licenseKey: true })
export type DashboardCreateProjectInput = z.input<typeof DashboardCreateProjectSchema>

export const UpdatePublishSettingsSchema = z.object({
    autoPublish: z.boolean(),
    publishMode: PublishModeSchema.optional(),
})
export type UpdatePublishSettingsInput = z.infer<typeof UpdatePublishSettingsSchema>

export const DeleteProjectSchema = z.object({
    deleteFramerCollection: z.boolean().default(true),
})
export type DeleteProjectInput = z.infer<typeof DeleteProjectSchema>

export interface DeleteProjectResponse {
    deleted: true
    framerCollectionCleared?: {
        collectionName: string | null
        itemsRemoved: number
        fieldsRemoved: number
    }
    /** Set when Framer cleanup failed but the project was still removed. */
    framerWarning?: string
}

export const LicenseVerifySchema = z.object({
    licenseKey: z.string().min(8),
    framerProjectUrl: FramerProjectUrlSchema,
})
export type LicenseVerifyInput = z.infer<typeof LicenseVerifySchema>

export interface NotionDataSourceSummary {
    id: string
    title: string
    databaseId?: string
}

export interface NotionPropertySummary {
    id: string
    name: string
    type: string
}

export interface SyncResult {
    itemsSynced: number
    itemsRemoved: number
    published: boolean
    deployed: boolean
    /** CMS synced but Framer publish was skipped (cooldown or transient API error). */
    publishSkipped?: boolean
    publishSkipReason?: string
}

export interface SyncErrorInfo {
    code: SyncErrorCode
    error: string
    details?: Record<string, unknown>
}

export interface CreateProjectResponse {
    projectId: string
    sync: SyncResult | null
    syncError?: SyncErrorInfo
}

export interface ProjectStatus {
    id: string
    framerProjectUrl: string
    framerCollectionName: string | null
    notionDataSourceTitle: string | null
    notionDataSourceId: string
    autoSync: boolean
    autoPublish: boolean
    publishMode: PublishMode
    licenseStatus: string
    lastSyncAt: string | null
    lastError: string | null
    /** Stable code for UI; set when last sync failed. */
    lastErrorCode: string | null
    itemsSyncedCount: number
    webhookStatus: string | null
    /** Latest Notion verification_token from POST /webhooks/notion (shown in plugin until cleared). */
    webhookVerificationToken: string | null
    /** Seconds until Framer publish is allowed again (null when not in cooldown). */
    publishCooldownRemainingSec: number | null
}

export const PLUGIN_KEYS = {
    PROJECT_ID: "projectId",
    FRAMER_PROJECT_URL: "framerProjectUrl",
    /** @deprecated Legacy wizard — thin plugin only stores projectId + framerProjectUrl */
    DATA_SOURCE_ID: "dataSourceId",
    SLUG_FIELD_ID: "slugFieldId",
    COLLECTION_NAME: "collectionName",
} as const
