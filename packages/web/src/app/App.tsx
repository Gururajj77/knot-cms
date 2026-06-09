import { Navigate, Route, Routes } from "react-router-dom"
import { Spinner } from "../components/ui"
import { LoginPage } from "../features/auth/LoginPage"
import { SubscribePage } from "../features/auth/SubscribePage"
import { DashboardPage } from "../features/projects/DashboardPage"
import { ProjectPage } from "../features/projects/ProjectPage"
import { SetupPage } from "../features/setup/SetupPage"
import { AuthProvider, useAuthContext } from "./AuthContext"

function AppRoutes() {
    const { loading, isAuthenticated, isEntitled, auth } = useAuthContext()

    if (loading) {
        return (
            <div className="pf-center">
                <Spinner label="Loading…" />
            </div>
        )
    }

    if (!isAuthenticated) {
        return <LoginPage />
    }

    if (!isEntitled) {
        return <SubscribePage email={auth?.email ?? ""} checkoutUrl={auth?.checkoutUrl} />
    }

    return (
        <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/setup" element={<SetupPage />} />
            <Route path="/projects/:projectId" element={<ProjectPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}

export function App() {
    return (
        <AuthProvider>
            <AppRoutes />
        </AuthProvider>
    )
}
