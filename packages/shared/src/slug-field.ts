import type { FieldMapping } from "./types.js"
import type { SetupSourceProvider } from "./setup-paths.js"
import { defaultFramerTypeForNotion } from "./transforms.js"

export function isSlugEligibleFieldMapping(
    mapping: FieldMapping,
    source: SetupSourceProvider
): boolean {
    if (mapping.framerFieldType === "string") return true
    if (source === "google_sheets") {
        return mapping.notionPropertyType === "string" || mapping.notionPropertyType === "url"
    }
    const framerType = defaultFramerTypeForNotion(mapping.notionPropertyType)
    return framerType === "string" || mapping.notionPropertyType === "title"
}
