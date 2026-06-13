export const ROUTES = {
    home: "/",
    setup: "/setup",
    reconfigure: (id: string) => `/projects/${id}/reconfigure`,
    /** Legacy URL — redirects to profilePlans when authenticated. */
    subscribe: "/subscribe",
    profilePlans: "/profile/plans",
    success: "/success",
    /** Plan picker, usage, billing, and account settings. */
    plans: "/profile/plans",
    project: (id: string) => `/projects/${id}`,
    googleLogin: "/auth/google/start?return_to=/",
} as const

export function googleLoginUrl(returnTo = "/"): string {
    return `/auth/google/start?return_to=${encodeURIComponent(returnTo)}`
}
