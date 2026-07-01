import {
    alignItemsToFramerFields,
    buildFramerFields,
    isFramerAssetUploadError,
    normalizeFramerItemSlug,
    planUserCollectionSync,
    stripImageFieldDataFromItems,
    SyncBoundaryError,
    userMessageForCode,
    type FieldMapping,
    type FramerItemPayload,
} from "@knotcms/shared"
import {
    connect,
    type Collection,
    type CollectionItemInput,
    type CreateField,
    type ManagedCollection,
    type ManagedCollectionFieldInput,
    type ManagedCollectionItemInput,
} from "framer-api"

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

export function fieldMappingsToCreateFields(mappings: FieldMapping[]): CreateField[] {
    const fields: CreateField[] = []
    for (const f of buildFramerFields(mappings)) {
        if (f.type === "enum" && f.cases) {
            fields.push({
                type: "enum",
                name: f.name,
                cases: f.cases.map(c => ({ name: c.name })),
            })
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
            fields.push({ type: f.type, name: f.name })
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
                message.includes("timeout") ||
                message.includes("response code 429") ||
                message.includes("could not get asset") ||
                message.includes("Assets upload")
            if (!retryable || attempt === retries - 1) break
            console.warn(`${label} retry ${attempt + 1}/${retries}: ${message}`)
            const backoffMs =
                message.includes("429") || message.includes("Could not get asset")
                    ? 1000 * 2 ** attempt
                    : 400 * (attempt + 1)
            await sleep(backoffMs)
        }
    }
    throw lastError
}

export async function addItemsWithAssetFallback<T>(
    label: string,
    add: (items: T[]) => Promise<void>,
    items: T[]
): Promise<void> {
    try {
        await withFramerRetry(label, () => add(items))
        return
    } catch (error) {
        if (!isFramerAssetUploadError(error)) throw error
        const { items: stripped, strippedCount } = stripImageFieldDataFromItems(
            items as unknown as FramerItemPayload[]
        )
        if (strippedCount === 0) throw error
        console.warn(
            `[sync] ${label}: remote image import failed, retrying without ${strippedCount} image field value(s)`
        )
        await withFramerRetry(`${label}-no-images`, () => add(stripped as unknown as T[]))
    }
}

async function findManagedCollectionByName(
    framer: Awaited<ReturnType<typeof connect>>,
    collectionName: string
): Promise<ManagedCollection | undefined> {
    return (await framer.getManagedCollections()).find(c => c.name === collectionName)
}

async function findManagedCollection(
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
async function clearManagedCollection(
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

async function findUserCollectionByName(
    framer: Awaited<ReturnType<typeof connect>>,
    collectionName: string
): Promise<Collection | undefined> {
    const collections = await framer.getCollections()
    return collections.find(c => c.name === collectionName && c.managedBy === "user")
}

/** Resolve or create a user-editable Framer CMS collection via Server API `createCollection`. */
export async function findOrCreateUserCollection(
    framer: Awaited<ReturnType<typeof connect>>,
    collectionName: string
): Promise<Collection> {
    let collection = await findUserCollectionByName(framer, collectionName)

    if (!collection) {
        await framer.createCollection(collectionName)
        for (const delayMs of [400, 800, 1200, 2000]) {
            await sleep(delayMs)
            collection = await findUserCollectionByName(framer, collectionName)
            if (collection) break
        }
    }

    if (!collection) {
        const names =
            (await framer.getCollections())
                .filter(c => c.managedBy === "user")
                .map(c => c.name)
                .join(", ") || "none"
        throw new Error(
            `Could not find or create user collection "${collectionName}". API sees: ${names}`
        )
    }

    return collection
}

/** Add mapped fields to a new user collection (skipped when the collection already has columns). */
export async function ensureUserCollectionFields(
    collection: Collection,
    mappings: FieldMapping[]
): Promise<void> {
    const existingFields = await withFramerRetry("getFields", () => collection.getFields())
    const customFields = existingFields.filter(field => field.type !== "unsupported")
    if (customFields.length > 0) return

    const createFields = fieldMappingsToCreateFields(mappings)
    if (createFields.length === 0) return

    await withFramerRetry("addFields", () => collection.addFields(createFields))
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

export type UserCollectionSyncResult = {
    collection: Collection
    itemsSynced: number
    itemsRemoved: number
}

/** Sync into an existing user-built Framer CMS collection (no setFields — preserves editor schema). */
export async function syncToUserCollection(
    framer: Awaited<ReturnType<typeof connect>>,
    collectionId: string,
    mappings: FieldMapping[],
    syncItems: FramerItemPayload[],
    options?: { preserveUnlinkedFramerRows?: boolean }
): Promise<UserCollectionSyncResult> {
    const collection = await framer.getCollection(collectionId)
    if (!collection) {
        throw new SyncBoundaryError(
            "FRAMER_COLLECTION",
            userMessageForCode("FRAMER_COLLECTION", "Framer CMS collection not found")
        )
    }

    if (collection.managedBy !== "user") {
        throw new SyncBoundaryError(
            "FRAMER_COLLECTION",
            userMessageForCode(
                "FRAMER_COLLECTION",
                "This Framer collection must be synced via the managed collection API"
            )
        )
    }

    const framerFields = await withFramerRetry("getFields", () => collection.getFields())
    const alignedItems = alignItemsToFramerFields(syncItems, mappings, framerFields)

    const existingItems = await withFramerRetry("getItems", () => collection.getItems())
    const { items: itemsToUpsert, idsToRemove } = planUserCollectionSync(
        alignedItems,
        existingItems.map(item => ({ id: item.id, slug: item.slug })),
        { removeUnmatched: !options?.preserveUnlinkedFramerRows }
    )

    if (idsToRemove.length > 0) {
        await withFramerRetry("removeItems", () => collection.removeItems(idsToRemove))
    }

    if (itemsToUpsert.length > 0) {
        await addItemsWithAssetFallback("addItems", items =>
            collection.addItems(items as unknown as CollectionItemInput[]), itemsToUpsert)
    }

    return {
        collection,
        itemsSynced: itemsToUpsert.length,
        itemsRemoved: idsToRemove.length,
    }
}

export type ManagedCollectionSyncResult = {
    collection: ManagedCollection
    itemsSynced: number
    itemsRemoved: number
}

/** Sync into an existing Server API managed collection (no setFields — preserves schema). */
export async function syncToExistingManagedCollection(
    framer: Awaited<ReturnType<typeof connect>>,
    collectionId: string,
    mappings: FieldMapping[],
    syncItems: FramerItemPayload[],
    options?: { preserveUnlinkedFramerRows?: boolean }
): Promise<ManagedCollectionSyncResult> {
    const collection = await findManagedCollection(framer, { collectionId })
    if (!collection) {
        throw new SyncBoundaryError(
            "FRAMER_COLLECTION",
            userMessageForCode("FRAMER_COLLECTION", "Framer managed collection not found")
        )
    }

    if (collection.managedBy === "anotherPlugin") {
        throw new SyncBoundaryError(
            "FRAMER_COLLECTION",
            userMessageForCode(
                "FRAMER_COLLECTION",
                "This Framer collection is owned by another plugin and cannot be updated in place"
            )
        )
    }

    const framerFields = await withFramerRetry("getFields", () => collection.getFields())
    const alignedItems = alignItemsToFramerFields(syncItems, mappings, framerFields)

    let existingItems: Array<{ id: string; slug: string }> = []
    const readable = await framer.getCollection(collectionId)
    if (readable) {
        try {
            existingItems = (await withFramerRetry("getItems", () => readable.getItems())).map(item => ({
                id: item.id,
                slug: item.slug,
            }))
        } catch {
            existingItems = []
        }
    }

    const alignedBySlug = new Map(
        alignedItems.map(item => [normalizeFramerItemSlug(item.slug), item])
    )

    let itemsToUpsert: ManagedCollectionItemInput[]
    let idsToRemove: string[]

    if (existingItems.length > 0) {
        const plan = planUserCollectionSync(alignedItems, existingItems, {
            removeUnmatched: !options?.preserveUnlinkedFramerRows,
        })
        itemsToUpsert = plan.items.map(item => ({
            ...item,
            id:
                item.id ??
                alignedBySlug.get(normalizeFramerItemSlug(item.slug))?.id ??
                crypto.randomUUID(),
        })) as ManagedCollectionItemInput[]
        idsToRemove = plan.idsToRemove
    } else {
        itemsToUpsert = alignedItems as unknown as ManagedCollectionItemInput[]
        const existingIds = new Set(await withFramerRetry("getItemIds", () => collection.getItemIds()))
        const notionIds = new Set(alignedItems.map(item => item.id))
        idsToRemove = [...existingIds].filter(id => !notionIds.has(id))
    }

    if (idsToRemove.length > 0) {
        await withFramerRetry("removeItems", () => collection.removeItems(idsToRemove))
    }

    if (itemsToUpsert.length > 0) {
        await addItemsWithAssetFallback("addItems", items =>
            collection.addItems(items as unknown as ManagedCollectionItemInput[]), itemsToUpsert)
    }

    return {
        collection,
        itemsSynced: itemsToUpsert.length,
        itemsRemoved: idsToRemove.length,
    }
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
