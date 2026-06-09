import { useCallback, useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import type { AuthMe } from "./api";
import { fetchAuthMe } from "./api";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { ProjectPage } from "./pages/ProjectPage";
import { SetupPage } from "./pages/SetupPage";
import { SubscribePage } from "./pages/SubscribePage";

export function App() {
  const [auth, setAuth] = useState<AuthMe | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAuth = useCallback(async () => {
    try {
      const me = await fetchAuthMe();
      setAuth(me.authenticated ? me : { authenticated: false });
    } catch {
      setAuth({ authenticated: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAuth();
  }, [refreshAuth]);

  if (loading) {
    return (
      <div className="pf-center">
        <p className="pf-meta">Loading…</p>
      </div>
    );
  }

  if (!auth?.authenticated) {
    return <LoginPage />;
  }

  if (!auth.entitled) {
    return (
      <SubscribePage email={auth.email ?? ""} checkoutUrl={auth.checkoutUrl} />
    );
  }

  return (
    <Routes>
      <Route path="/" element={<DashboardPage onLogout={refreshAuth} />} />
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/projects/:projectId" element={<ProjectPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
