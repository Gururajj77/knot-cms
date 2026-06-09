import { Navigate, Route, Routes } from "react-router-dom"
import { Spinner, ToastProvider } from "../components/ui"
import { LoginPage } from "../features/auth/LoginPage"
import { SubscribePage } from "../features/auth/SubscribePage"
import { DashboardPage } from "../features/projects/DashboardPage"
import { ProjectPage } from "../features/projects/ProjectPage"
import { SetupPage } from "../features/setup/SetupPage"
import { ROUTES } from "../constants/routes"
import { AuthProvider, useAuthContext } from "./AuthContext"
import { RequireEntitlement } from "./RequireEntitlement"

function AppRoutes() {
    const { loading, isAuthenticated } = useAuthContext()

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

    return (
        <Routes>
            <Route path={ROUTES.subscribe} element={<SubscribePage />} />
            <Route
                path={ROUTES.home}
                element={
                    <RequireEntitlement>
                        <DashboardPage />
                    </RequireEntitlement>
                }
            />
            <Route
                path={ROUTES.setup}
                element={
                    <RequireEntitlement>
                        <SetupPage />
                    </RequireEntitlement>
                }
            />
            <Route
                path="/projects/:projectId"
                element={
                    <RequireEntitlement>
                        <ProjectPage />
                    </RequireEntitlement>
                }
            />
            <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
        </Routes>
    )
}

export function App() {
    return (
        <ToastProvider>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </ToastProvider>
    )
}
