import type { Env } from "../env.js"
import { getWebhookPublicBaseUrl } from "./public-origin.js"

const WATCH_TTL_MS = 7 * 24 * 60 * 60 * 1000 - 60_000

export interface DriveWatchRecord {
    channelId: string
    resourceId: string
    channelToken: string
    expiresAt: string
}

async function stopDriveChannel(
    accessToken: string,
    channelId: string,
    resourceId: string
): Promise<void> {
    const response = await fetch("https://www.googleapis.com/drive/v3/channels/stop", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: channelId, resourceId }),
    })
    if (!response.ok && response.status !== 404) {
        const body = await response.text()
        console.warn("Failed to stop Drive channel:", body)
    }
}

export function newDriveWatchChannel(): {
    channelId: string
    channelToken: string
    expiresAt: string
    expirationMs: number
} {
    const channelId = crypto.randomUUID()
    const channelToken = crypto.randomUUID()
    const expirationMs = Date.now() + WATCH_TTL_MS
    return {
        channelId,
        channelToken,
        expiresAt: new Date(expirationMs).toISOString(),
        expirationMs,
    }
}

/** Register a watch with Google using channel ids staged in D1 before this call. */
export async function registerDriveWatch(
    env: Env,
    accessToken: string,
    spreadsheetId: string,
    channel: { channelId: string; channelToken: string; expirationMs: number },
    existing?: { channelId: string | null; resourceId: string | null }
): Promise<DriveWatchRecord> {
    if (
        existing?.channelId &&
        existing.resourceId &&
        existing.channelId !== channel.channelId
    ) {
        await stopDriveChannel(accessToken, existing.channelId, existing.resourceId)
    }

    const { channelId, channelToken, expirationMs: expiration } = channel
    const base = getWebhookPublicBaseUrl(env)
    if (!base.startsWith("https://")) {
        throw new Error(
            "Drive watch requires an HTTPS webhook URL. Set WEBHOOK_PUBLIC_URL in packages/worker/.dev.vars to your named tunnel hostname (see docs/NAMED_TUNNEL.md)."
        )
    }
    const address = `${base}/webhooks/google-drive`

    const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(spreadsheetId)}/watch`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                id: channelId,
                type: "web_hook",
                address,
                token: channelToken,
                expiration: String(expiration),
            }),
        }
    )

    if (!response.ok) {
        const body = await response.text()
        throw new Error(`Drive watch registration failed: ${body}`)
    }

    const data = (await response.json()) as { resourceId?: string }
    return {
        channelId,
        resourceId: data.resourceId ?? spreadsheetId,
        channelToken,
        expiresAt: new Date(expiration).toISOString(),
    }
}

export function isDriveWatchExpired(expiresAt: string | null | undefined): boolean {
    if (!expiresAt) return true
    return new Date(expiresAt).getTime() <= Date.now()
}
