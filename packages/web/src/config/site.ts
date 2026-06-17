/** Marketing site — legal pages are also authored in the knotcms-website repo. */
export const SITE_URL = "https://knotcms.com"

export const DOCS_URL = "https://docs.knotcms.com"

export const APP_URL = "https://app.knotcms.com"

export const SUPPORT_EMAIL = "framerskool@gmail.com"

/** Featurebase — feedback, support threads, and public roadmap. */
const FEATUREBASE_URL = "https://knotcms.featurebase.app/"
export const FEATUREBASE_FEEDBACK_URL = FEATUREBASE_URL
export const FEATUREBASE_ROADMAP_URL = `${FEATUREBASE_URL}roadmap`

export const COMPANY_NAME = "KnotCMS"

export const PRICE_PER_PROJECT_MONTHLY_USD = 9

/** Last updated date shown on legal pages (ISO date). Keep in sync with knotcms-website. */
export const LEGAL_LAST_UPDATED = "2026-06-12"

export function formatLegalLastUpdated(isoDate: string): string {
    return new Date(isoDate).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
    })
}
