export const KNOTCMS_COLLECTION_SUFFIX = " · KnotCMS"

/** Distinct Framer managed collection name — avoids colliding with the source CMS collection. */
export function managedCollectionSyncName(notionDataSourceTitle: string | null | undefined): string {
    const base = notionDataSourceTitle?.trim() || "Notion Sync"
    if (base.endsWith(KNOTCMS_COLLECTION_SUFFIX)) return base
    return `${base}${KNOTCMS_COLLECTION_SUFFIX}`
}
