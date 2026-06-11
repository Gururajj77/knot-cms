import type { ReactNode } from "react"
import { Navigate } from "react-router-dom"
import { ROUTES } from "../constants/routes"
import { useAuthContext } from "./AuthContext"

export function RequireEntitlement({ children }: { children: ReactNode }) {
    const { isEntitled, loading } = useAuthContext()

    if (loading) return null
    if (!isEntitled) {
        return <Navigate to={ROUTES.profilePlans} replace />
    }

    return children
}
