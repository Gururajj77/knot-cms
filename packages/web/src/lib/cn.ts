/** Join class names — keeps JSX readable without a classnames dependency. */
export function cn(...parts: Array<string | false | null | undefined>): string {
    return parts.filter(Boolean).join(" ")
}
