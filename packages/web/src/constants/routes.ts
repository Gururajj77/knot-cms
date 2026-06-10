export const ROUTES = {
    home: "/",
    setup: "/setup",
    subscribe: "/subscribe",
    /** Unified plan picker + usage (scrolls to pricing grid). */
    plans: "/subscribe#plans",
    project: (id: string) => `/projects/${id}`,
    googleLogin: "/auth/google/start?return_to=/",
} as const
