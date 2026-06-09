export const ROUTES = {
    home: "/",
    setup: "/setup",
    project: (id: string) => `/projects/${id}`,
    googleLogin: "/auth/google/start?return_to=/",
} as const
