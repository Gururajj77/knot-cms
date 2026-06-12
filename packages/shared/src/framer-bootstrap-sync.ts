import type { FramerSyncDestination } from "./framer-sync-target.js"
import type { SetupPathId } from "./setup-paths.js"

/** True when Notion is not yet a full mirror of the Framer template collection. */
export function shouldPreserveUnlinkedFramerRows(input: {
    setupPath: SetupPathId
    syncDestination: FramerSyncDestination
    importRowCount: number
    framerRowTotal: number
}): boolean {
    if (input.setupPath !== "framer_to_notion") return false
    if (input.syncDestination !== "in_place") return false
    if (input.importRowCount === 0) return true
    if (input.framerRowTotal <= 0) return false
    return input.importRowCount < input.framerRowTotal
}
