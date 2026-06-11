import { useCallback, useEffect, useMemo, useState } from "react"
import type { AuthMe, AuthMeUsage } from "../lib/api"
import { fetchAuthMe } from "../lib/api"
import {
    canCreateProject,
    canSync,
    canUseProjectFeatures,
    hasAutoPublish,
    hasAutoSync,
    isOverProjectLimit,
    planUsageAlert,
} from "../lib/plan-usage"

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

    const usage = auth?.usage ?? null

    const planLimits = useMemo(
        () => ({
            usage,
            canCreateProject: canCreateProject(usage),
            canSync: canSync(usage),
            canUseProjectFeatures: canUseProjectFeatures(usage),
            isOverProjectLimit: isOverProjectLimit(usage),
            hasAutoSync: hasAutoSync(usage),
            hasAutoPublish: hasAutoPublish(usage),
            usageAlert: planUsageAlert(usage),
        }),
        [usage]
    )

    return {
        auth,
        loading,
        refresh,
        isAuthenticated: Boolean(auth?.authenticated),
        isEntitled: Boolean(auth?.entitled),
        ...planLimits,
    }
}

export type PlanLimits = {
    usage: AuthMeUsage | null
    canCreateProject: boolean
    canSync: boolean
    canUseProjectFeatures: boolean
    isOverProjectLimit: boolean
    hasAutoSync: boolean
    hasAutoPublish: boolean
    usageAlert: ReturnType<typeof planUsageAlert>
}
