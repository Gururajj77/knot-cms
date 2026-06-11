import {
    buildFramerCollectionSummary,
    framerFieldToTemplateField,
    SyncBoundaryError,
    userMessageForCode,
    type FramerCollectionSummary,
} from "@knotcms/shared"
import { connect } from "framer-api"

/**
 * List Framer CMS collections with field summaries and Notion bootstrap previews.
 */
export async function listFramerCollections(
    framerProjectUrl: string,
    framerApiKey: string
): Promise<FramerCollectionSummary[]> {
    const projectUrl = framerProjectUrl.replace(/\/$/, "")
    const apiKey = framerApiKey.trim()

    try {
        using framer = await connect(projectUrl, apiKey)
        const collections = await framer.getCollections()
        const summaries: FramerCollectionSummary[] = []

        for (const collection of collections) {
            const rawFields = await collection.getFields()
            const fields = rawFields.map(field => framerFieldToTemplateField(field))

            let itemCount = 0
            try {
                itemCount = (await collection.getItems()).length
            } catch {
                itemCount = 0
            }

            summaries.push(
                buildFramerCollectionSummary({
                    id: collection.id,
                    name: collection.name,
                    managedBy: collection.managedBy,
                    itemCount,
                    fields,
                })
            )
        }

        return summaries
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        const lower = message.toLowerCase()

        if (
            lower.includes("unauthorized") ||
            lower.includes("does not have access") ||
            lower.includes("invalid api key") ||
            lower.includes("forbidden")
        ) {
            throw new SyncBoundaryError("FRAMER_UNAUTHORIZED", userMessageForCode("FRAMER_UNAUTHORIZED"))
        }

        throw new SyncBoundaryError(
            "FRAMER_COLLECTION",
            userMessageForCode("FRAMER_COLLECTION", `Could not list Framer collections: ${message.slice(0, 120)}`)
        )
    }
}
