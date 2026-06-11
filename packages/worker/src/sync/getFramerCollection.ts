import {
    buildFramerCollectionSummary,
    framerFieldToTemplateField,
    SyncBoundaryError,
    userMessageForCode,
    type FramerCollectionItemLike,
    type FramerCollectionSummary,
    type FramerTemplateField,
} from "@knotcms/shared"
import { connect } from "framer-api"

export type FramerCollectionDetails = {
    summary: FramerCollectionSummary
    fields: FramerTemplateField[]
    items: FramerCollectionItemLike[]
}

function framerConnectError(error: unknown): never {
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
        userMessageForCode("FRAMER_COLLECTION", `Could not read Framer collection: ${message.slice(0, 120)}`)
    )
}

function serializeFramerItems(
    items: Array<{
        id: string
        slug: string
        draft?: boolean
        fieldData: Record<string, { type: string; value: unknown }>
    }>
): FramerCollectionItemLike[] {
    return items.map(item => ({
        id: item.id,
        slug: item.slug,
        draft: item.draft ?? false,
        fieldData: Object.fromEntries(
            Object.entries(item.fieldData).map(([key, entry]) => [
                key,
                { type: entry.type, value: entry.value },
            ])
        ),
    }))
}

export async function getFramerCollectionDetails(
    framerProjectUrl: string,
    framerApiKey: string,
    collectionId: string
): Promise<FramerCollectionDetails> {
    const projectUrl = framerProjectUrl.replace(/\/$/, "")
    const apiKey = framerApiKey.trim()

    try {
        using framer = await connect(projectUrl, apiKey)
        const collection =
            (await framer.getCollection(collectionId)) ??
            (await framer.getCollections()).find(c => c.id === collectionId)

        if (!collection) {
            throw new SyncBoundaryError(
                "FRAMER_COLLECTION",
                userMessageForCode("FRAMER_COLLECTION", "Framer collection not found")
            )
        }

        const rawFields = await collection.getFields()
        const fields = rawFields.map(field => framerFieldToTemplateField(field))

        let items: FramerCollectionItemLike[] = []
        try {
            items = serializeFramerItems(await collection.getItems())
        } catch {
            items = []
        }

        const summary = buildFramerCollectionSummary({
            id: collection.id,
            name: collection.name,
            managedBy: collection.managedBy,
            itemCount: items.length,
            fields,
        })

        return { summary, fields, items }
    } catch (error) {
        if (error instanceof SyncBoundaryError) throw error
        framerConnectError(error)
    }
}
