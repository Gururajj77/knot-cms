import { z } from "zod"

export const GOOGLE_SHEETS_READONLY_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly"
export const GOOGLE_DRIVE_READONLY_SCOPE = "https://www.googleapis.com/auth/drive.readonly"

export const ResolveGoogleSheetUrlSchema = z.object({
    url: z.string().trim().min(1).max(2000),
})

export type ResolveGoogleSheetUrlInput = z.infer<typeof ResolveGoogleSheetUrlSchema>

export interface ParsedGoogleSpreadsheetUrl {
    spreadsheetId: string
    sheetGid: number | null
}

/** Extract spreadsheet id and optional tab gid from a Google Sheets share URL. */
export function parseGoogleSpreadsheetUrl(input: string): ParsedGoogleSpreadsheetUrl | null {
    const trimmed = input.trim()
    const idMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
    if (!idMatch?.[1]) return null

    const gidMatch = trimmed.match(/(?:[#?&]gid=)(\d+)/)
    const sheetGid = gidMatch?.[1] ? Number.parseInt(gidMatch[1], 10) : null

    return {
        spreadsheetId: idMatch[1],
        sheetGid: Number.isFinite(sheetGid) ? sheetGid : null,
    }
}

export function sheetTabFromGid(
    tabs: SheetTabSummary[],
    sheetGid: number | null
): SheetTabSummary | null {
    if (tabs.length === 0) return null
    if (sheetGid === null) return tabs[0] ?? null
    return tabs.find(tab => tab.sheetId === sheetGid) ?? tabs[0] ?? null
}

export function formatSheetSourceTitle(spreadsheetTitle: string, tabTitle: string): string {
    return `${spreadsheetTitle} / ${tabTitle}`
}

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

export async function fetchSpreadsheetMetadata(
    accessToken: string,
    spreadsheetId: string
): Promise<{ title: string; tabs: SheetTabSummary[] }> {
    const data = await googleApiFetch<{
        properties?: { title?: string }
        sheets?: Array<{ properties?: { sheetId?: number; title?: string } }>
    }>(
        accessToken,
        `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=properties.title,sheets.properties`
    )

    const tabs = (data.sheets ?? [])
        .map(sheet => ({
            sheetId: sheet.properties?.sheetId ?? 0,
            title: sheet.properties?.title ?? "Sheet",
        }))
        .filter(sheet => Number.isFinite(sheet.sheetId) && sheet.sheetId >= 0)

    return {
        title: data.properties?.title?.trim() || "Untitled spreadsheet",
        tabs,
    }
}

export async function listSheetTabs(
    accessToken: string,
    spreadsheetId: string
): Promise<SheetTabSummary[]> {
    const { tabs } = await fetchSpreadsheetMetadata(accessToken, spreadsheetId)
    return tabs
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
