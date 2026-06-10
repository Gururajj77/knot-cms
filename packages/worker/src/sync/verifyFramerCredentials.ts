import { SyncBoundaryError, userMessageForCode } from "@nocms/shared"
import { connect } from "framer-api"

export type VerifiedFramerCredentials = {
    projectUrl: string
    apiKey: string
}

/**
 * Prove Framer URL + API key work before persisting secrets.
 * Does not create or modify collections.
 */
export async function verifyFramerCredentials(
    framerProjectUrl: string,
    framerApiKey: string
): Promise<VerifiedFramerCredentials> {
    const projectUrl = framerProjectUrl.replace(/\/$/, "")
    const apiKey = framerApiKey.trim()

    try {
        using framer = await connect(projectUrl, apiKey)
        await framer.getManagedCollections()
        return { projectUrl, apiKey }
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
            userMessageForCode("FRAMER_COLLECTION", `Could not reach Framer: ${message.slice(0, 120)}`)
        )
    }
}
