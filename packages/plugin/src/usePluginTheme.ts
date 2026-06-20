import { useCallback, useEffect, useState } from "react"

export type PluginTheme = "light" | "dark"

const STORAGE_KEY = "knotcms-plugin-theme"

function readStoredTheme(): PluginTheme {
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored === "light" || stored === "dark") return stored
    } catch {
        /* private mode / blocked storage */
    }
    return "dark"
}

export function applyPluginTheme(theme: PluginTheme): void {
    document.documentElement.dataset.pfTheme = theme
}

/** Call before React mounts to avoid a flash of the wrong theme. */
export function initPluginTheme(): PluginTheme {
    const theme = readStoredTheme()
    applyPluginTheme(theme)
    return theme
}

export function usePluginTheme() {
    const [theme, setThemeState] = useState<PluginTheme>(() => readStoredTheme())

    useEffect(() => {
        applyPluginTheme(theme)
        try {
            localStorage.setItem(STORAGE_KEY, theme)
        } catch {
            /* ignore */
        }
    }, [theme])

    const setTheme = useCallback((next: PluginTheme) => {
        setThemeState(next)
    }, [])

    const toggleTheme = useCallback(() => {
        setThemeState(current => (current === "dark" ? "light" : "dark"))
    }, [])

    return { theme, setTheme, toggleTheme }
}
