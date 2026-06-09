export const ROUTES = {
    home: "/",
    setup: "/setup",
    subscribe: "/subscribe",
    project: (id: string) => `/projects/${id}`,
    googleLogin: "/auth/google/start?return_to=/",
} as const
