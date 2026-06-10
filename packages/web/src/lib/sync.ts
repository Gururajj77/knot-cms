import type { SyncResult } from "@nocms/shared"

export type SyncFeedbackTone = "success" | "info"

export function formatSyncFeedback(result: SyncResult): { tone: SyncFeedbackTone; message: string } {
    const parts = [`Synced ${result.itemsSynced} item${result.itemsSynced === 1 ? "" : "s"}`]
    if (result.itemsRemoved > 0) {
        parts.push(`removed ${result.itemsRemoved}`)
    }

    if (result.published) {
        const publishNote = result.deployed ? "published to live site" : "preview published"
        return { tone: "success", message: `${parts.join(", ")} — ${publishNote}.` }
    }

    if (result.publishSkipped) {
        const reason = result.publishSkipReason ?? "publish unavailable"
        return {
            tone: "info",
            message: `${parts.join(", ")} to Framer CMS. Live publish skipped (${reason}).`,
        }
    }

    return { tone: "success", message: `${parts.join(", ")} to Framer CMS.` }
}
