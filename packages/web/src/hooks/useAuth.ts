import { useCallback, useEffect, useState } from "react"
import type { AuthMe } from "../lib/api"
import { fetchAuthMe } from "../lib/api"

export function useAuth() {
    const [auth, setAuth] = useState<AuthMe | null>(null)
    const [loading, setLoading] = useState(true)

    const refresh = useCallback(async () => {
        try {
            const me = await fetchAuthMe()
            setAuth(me.authenticated ? me : { authenticated: false })
        } catch {
            setAuth({ authenticated: false })
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        void refresh()
    }, [refresh])

    return {
        auth,
        loading,
        refresh,
        isAuthenticated: Boolean(auth?.authenticated),
        isEntitled: Boolean(auth?.entitled),
    }
}
