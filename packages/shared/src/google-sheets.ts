export const GOOGLE_SHEETS_READONLY_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly"
export const GOOGLE_DRIVE_READONLY_SCOPE = "https://www.googleapis.com/auth/drive.readonly"

export class GoogleSheetsApiError extends Error {
    constructor(
        message: string,
        readonly status: number,
        readonly body?: string
    ) {
        super(message)
        this.name = "GoogleSheetsApiError"
    }
}

async function googleApiFetch<T>(
    accessToken: string,
    url: string,
    init?: RequestInit
): Promise<T> {
    const response = await fetch(url, {
        ...init,
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            ...(init?.headers ?? {}),
        },
    })

    if (!response.ok) {
        const body = await response.text()
        throw new GoogleSheetsApiError(
            `Google API error (${response.status})`,
            response.status,
            body
        )
    }

    if (response.status === 204) return undefined as T
    return (await response.json()) as T
}

export interface SpreadsheetSummary {
    id: string
    title: string
}

export interface SheetTabSummary {
    sheetId: number
    title: string
}

export async function listSpreadsheets(accessToken: string): Promise<SpreadsheetSummary[]> {
    const params = new URLSearchParams({
        q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
        fields: "files(id,name)",
        pageSize: "100",
        orderBy: "modifiedTime desc",
    })
    const data = await googleApiFetch<{ files?: Array<{ id: string; name: string }> }>(
        accessToken,
        `https://www.googleapis.com/drive/v3/files?${params}`
    )
    return (data.files ?? []).map(file => ({ id: file.id, title: file.name }))
}

export async function listSheetTabs(
    accessToken: string,
    spreadsheetId: string
): Promise<SheetTabSummary[]> {
    const data = await googleApiFetch<{
        sheets?: Array<{ properties?: { sheetId?: number; title?: string } }>
    }>(accessToken, `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`)
    return (data.sheets ?? [])
        .map(sheet => ({
            sheetId: sheet.properties?.sheetId ?? 0,
            title: sheet.properties?.title ?? "Sheet",
        }))
        .filter(sheet => sheet.sheetId > 0)
}

export async function fetchSheetValues(
    accessToken: string,
    spreadsheetId: string,
    sheetTitle: string
): Promise<string[][]> {
    const range = encodeURIComponent(`${sheetTitle}!A1:ZZ`)
    const data = await googleApiFetch<{ values?: string[][] }>(
        accessToken,
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`
    )
    return data.values ?? []
}
