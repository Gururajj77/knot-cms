import type { PluginTheme } from "../usePluginTheme"

interface ThemeToggleProps {
    theme: PluginTheme
    onToggle: () => void
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
    const nextLabel = theme === "dark" ? "Switch to light mode" : "Switch to dark mode"

    return (
        <button
            type="button"
            className="pf-theme-toggle"
            onClick={onToggle}
            aria-label={nextLabel}
            title={nextLabel}
        >
            {theme === "dark" ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <circle cx="8" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.25" />
                    <path
                        d="M8 1.25v1.5M8 13.25v1.5M1.25 8h1.5M13.25 8h1.5M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06"
                        stroke="currentColor"
                        strokeWidth="1.25"
                        strokeLinecap="round"
                    />
                </svg>
            ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <path
                        d="M7.2 1.8a5.75 5.75 0 1 0 6.25 6.25A4.75 4.75 0 1 1 7.2 1.8Z"
                        stroke="currentColor"
                        strokeWidth="1.25"
                        strokeLinejoin="round"
                    />
                </svg>
            )}
        </button>
    )
}
