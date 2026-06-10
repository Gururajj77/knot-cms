export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8787"

/** Web dashboard base URL (defaults to API host when worker serves the web app). */
export const WEB_APP_URL = import.meta.env.VITE_WEB_APP_URL ?? API_BASE_URL
