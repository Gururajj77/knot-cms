const PRODUCTION_APP_URL = "https://app.knotcms.com"

const devDefault = "http://localhost:8787"

export const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? devDefault : PRODUCTION_APP_URL)

/** Web dashboard base URL (defaults to API host when worker serves the web app). */
export const WEB_APP_URL = import.meta.env.VITE_WEB_APP_URL ?? API_BASE_URL

const PRODUCTION_DASHBOARD_URL = PRODUCTION_APP_URL
