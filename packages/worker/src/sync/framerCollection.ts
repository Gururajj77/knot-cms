import { buildFramerFields, type FieldMapping } from "@nocms/shared"
import { connect, type ManagedCollection, type ManagedCollectionFieldInput } from "framer-api"

export function fieldMappingsToManagedInputs(mappings: FieldMapping[]): ManagedCollectionFieldInput[] {
    const fields: ManagedCollectionFieldInput[] = []
    for (const f of buildFramerFields(mappings)) {
        if (f.type === "enum" && f.cases) {
            fields.push({ id: f.id, name: f.name, type: "enum", cases: f.cases })
            continue
        }
        if (
            f.type === "string" ||
            f.type === "number" ||
            f.type === "boolean" ||
            f.type === "formattedText" ||
            f.type === "date" ||
            f.type === "link" ||
            f.type === "image"
        ) {
            fields.push({ id: f.id, name: f.name, type: f.type })
        }
    }
    return fields
}

export function collectionDisplayName(notionDataSourceTitle: string | null): string {
    const name = notionDataSourceTitle?.trim()
    return name && name.length > 0 ? name : "Notion Sync"
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export async function withFramerRetry<T>(
    label: string,
    fn: () => Promise<T>,
    retries = 4
): Promise<T> {
    let lastError: unknown
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            return await fn()
        } catch (error) {
            lastError = error
            const message = error instanceof Error ? error.message : String(error)
            const retryable =
                message.includes("collection node") ||
                message.includes("not ready") ||
                message.includes("timeout")
            if (!retryable || attempt === retries - 1) break
            console.warn(`${label} retry ${attempt + 1}/${retries}: ${message}`)
            await sleep(400 * (attempt + 1))
        }
    }
    throw lastError
}

async function findManagedCollectionByName(
    framer: Awaited<ReturnType<typeof connect>>,
    collectionName: string
): Promise<ManagedCollection | undefined> {
    return (await framer.getManagedCollections()).find(c => c.name === collectionName)
}

export async function findManagedCollection(
    framer: Awaited<ReturnType<typeof connect>>,
    options: { collectionId?: string; collectionName?: string | null }
): Promise<ManagedCollection | undefined> {
    const collections = await framer.getManagedCollections()
    if (options.collectionId && options.collectionId !== "pending") {
        const byId = collections.find(c => c.id === options.collectionId)
        if (byId) return byId
    }
    if (options.collectionName) {
        return findManagedCollectionByName(framer, options.collectionName)
    }
    return undefined
}

/** Remove all items and fields from a managed collection (Framer has no delete-collection API). */
export async function clearManagedCollection(
    framer: Awaited<ReturnType<typeof connect>>,
    options: { collectionId: string; collectionName?: string | null }
): Promise<{ itemsRemoved: number; fieldsRemoved: number; collectionName: string | null }> {
    const collection = await findManagedCollection(framer, options)
    if (!collection) {
        return { itemsRemoved: 0, fieldsRemoved: 0, collectionName: null }
    }

    const itemIds = await withFramerRetry("getItemIds", () => collection.getItemIds())
    if (itemIds.length > 0) {
        await withFramerRetry("removeItems", () => collection.removeItems(itemIds))
    }

    const fields = await withFramerRetry("getFields", () => collection.getFields())
    if (fields.length > 0) {
        await withFramerRetry("setFields", () => collection.setFields([]))
    }

    return {
        itemsRemoved: itemIds.length,
        fieldsRemoved: fields.length,
        collectionName: collection.name,
    }
}

/** Resolve only via Server API managed collections (by name). Editor collection IDs are not valid here. */
export async function findOrCreateManagedCollection(
    framer: Awaited<ReturnType<typeof connect>>,
    collectionName: string
): Promise<ManagedCollection> {
    let collection = await findManagedCollectionByName(framer, collectionName)

    if (!collection) {
        await framer.createManagedCollection(collectionName)
        for (const delayMs of [400, 800, 1200, 2000]) {
            await sleep(delayMs)
            collection = await findManagedCollectionByName(framer, collectionName)
            if (collection) break
        }
    }

    if (!collection) {
        const names = (await framer.getManagedCollections()).map(c => c.name).join(", ") || "none"
        throw new Error(
            `Could not find or create managed collection "${collectionName}". API sees: ${names}`
        )
    }

    return collection
}

/** Re-fetch after create/setFields so addItems targets a ready collection node. */
export async function refreshManagedCollection(
    framer: Awaited<ReturnType<typeof connect>>,
    collectionName: string
): Promise<ManagedCollection> {
    for (const delayMs of [200, 400, 600]) {
        const collection = await findManagedCollectionByName(framer, collectionName)
        if (collection) return collection
        await sleep(delayMs)
    }
    return findOrCreateManagedCollection(framer, collectionName)
}

export async function publishIfEnabled(
    framer: Awaited<ReturnType<typeof connect>>,
    autoPublish: boolean,
    publishMode: string
): Promise<{ published: boolean; deployed: boolean }> {
    if (!autoPublish) {
        return { published: false, deployed: false }
    }

    const { deployment } = await framer.publish()
    let deployed = false
    if (publishMode === "deploy_live" && deployment?.id) {
        await framer.deploy(deployment.id)
        deployed = true
    }
    return { published: true, deployed }
}
