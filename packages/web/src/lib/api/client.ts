export class ApiError extends Error {
    constructor(
        message: string,
        public readonly status?: number,
        public readonly checkoutUrl?: string | null,
        public readonly code?: string
    ) {
        super(message)
        this.name = "ApiError"
    }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
    const method = (init?.method ?? "GET").toUpperCase()
    const headers = new Headers(init?.headers)
    if (method !== "GET" && method !== "HEAD" && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json")
    }

    const response = await fetch(path, {
        ...init,
        headers,
        credentials: "include",
    })

    if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
            error?: string | Record<string, unknown>
            code?: string
            checkoutUrl?: string | null
        }
        const message =
            typeof body.error === "string"
                ? body.error
                : body.error
                  ? JSON.stringify(body.error)
                  : `Request failed (${response.status})`
        throw new ApiError(message, response.status, body.checkoutUrl, body.code)
    }

    return response.json() as Promise<T>
}
