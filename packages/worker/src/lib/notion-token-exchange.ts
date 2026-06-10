import { NOTION_VERSION } from "@nocms/shared"
import type { Env } from "../env.js"

const NOTION_TOKEN_URL = "https://api.notion.com/v1/oauth/token"

export interface NotionTokenResponse {
    access_token: string
    refresh_token?: string | null
    workspace_name?: string | null
}

function basicAuthHeader(clientId: string, clientSecret: string): string {
    const credentials = `${clientId}:${clientSecret}`
    const bytes = new TextEncoder().encode(credentials)
    let binary = ""
    for (const byte of bytes) {
        binary += String.fromCharCode(byte)
    }
    return `Basic ${btoa(binary)}`
}

type TokenAttempt = () => Promise<Response>

function buildAttempts(
    clientId: string,
    clientSecret: string,
    code: string,
    redirectUri: string
): TokenAttempt[] {
    const commonHeaders = {
        Accept: "application/json",
        "Notion-Version": NOTION_VERSION,
    }

    return [
        () =>
            fetch(NOTION_TOKEN_URL, {
                method: "POST",
                headers: {
                    ...commonHeaders,
                    "Content-Type": "application/json",
                    Authorization: basicAuthHeader(clientId, clientSecret),
                },
                body: JSON.stringify({
                    grant_type: "authorization_code",
                    code,
                    redirect_uri: redirectUri,
                }),
            }),
        () =>
            fetch(NOTION_TOKEN_URL, {
                method: "POST",
                headers: {
                    ...commonHeaders,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    grant_type: "authorization_code",
                    code,
                    redirect_uri: redirectUri,
                    client_id: clientId,
                    client_secret: clientSecret,
                }),
            }),
        () => {
            const body = new URLSearchParams({
                grant_type: "authorization_code",
                code,
                redirect_uri: redirectUri,
            })
            return fetch(NOTION_TOKEN_URL, {
                method: "POST",
                headers: {
                    ...commonHeaders,
                    "Content-Type": "application/x-www-form-urlencoded",
                    Authorization: basicAuthHeader(clientId, clientSecret),
                },
                body: body.toString(),
            })
        },
    ]
}

export async function exchangeNotionOAuthCode(
    env: Env,
    input: { code: string; redirectUri: string }
): Promise<NotionTokenResponse> {
    const clientId = env.NOTION_CLIENT_ID.trim()
    const clientSecret = env.NOTION_CLIENT_SECRET.trim()

    const attempts = buildAttempts(clientId, clientSecret, input.code, input.redirectUri)
    let lastBody = ""
    let lastStatus = 500

    for (const attempt of attempts) {
        const response = await attempt()
        if (response.ok) {
            return (await response.json()) as NotionTokenResponse
        }

        lastBody = await response.text()
        lastStatus = response.status
        if (!lastBody.includes("invalid_client")) {
            break
        }
    }

    throw new NotionTokenExchangeError(lastBody, lastStatus, clientId)
}

export class NotionTokenExchangeError extends Error {
    constructor(
        public readonly body: string,
        public readonly status: number,
        public readonly clientId: string
    ) {
        super(body)
        this.name = "NotionTokenExchangeError"
    }
}

/** Probe credentials with a fake code — invalid_grant means auth succeeded. */
export async function probeNotionOAuthCredentials(env: Env, redirectUri: string): Promise<string | null> {
    const clientId = env.NOTION_CLIENT_ID.trim()
    const clientSecret = env.NOTION_CLIENT_SECRET.trim()

    const response = await fetch(NOTION_TOKEN_URL, {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "Notion-Version": NOTION_VERSION,
            Authorization: basicAuthHeader(clientId, clientSecret),
        },
        body: JSON.stringify({
            grant_type: "authorization_code",
            code: "nocms-credential-probe",
            redirect_uri: redirectUri,
        }),
    })

    const body = await response.text()
    if (body.includes("invalid_client")) {
        return (
            "Notion rejected your OAuth client ID/secret. In notion.so/my-integrations open your PUBLIC connection → " +
            "Configuration → copy OAuth client ID and regenerate OAuth client secret (shown once). Update packages/worker/.dev.vars and restart the worker."
        )
    }

    return null
}
