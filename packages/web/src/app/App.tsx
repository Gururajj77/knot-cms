import { Navigate, Route, Routes } from "react-router-dom"
import { Spinner, ToastProvider } from "../components/ui"
import { CheckoutSuccessPage } from "../features/auth/CheckoutSuccessPage"
import { LoginPage } from "../features/auth/LoginPage"
import { ProfilePlansPage } from "../features/profile/ProfilePlansPage"
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

    return (
        <Routes>
            <Route path={ROUTES.success} element={<CheckoutSuccessPage />} />
            {!isAuthenticated ? (
                <Route path="*" element={<LoginPage />} />
            ) : (
                <>
                    <Route path={ROUTES.profilePlans} element={<ProfilePlansPage />} />
                    <Route
                        path={ROUTES.subscribe}
                        element={<Navigate to={ROUTES.profilePlans} replace />}
                    />
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
                </>
            )}
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
