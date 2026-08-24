import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Groups from "./pages/Groups";
import GroupDetail from "./pages/GroupDetail";
import Insights from "./pages/Insights";
import AIAdvisorPage from "./pages/AIAdvisorPage";
import NotificationsPage from "./pages/NotificationsPage";

// Keying this wrapper by the current path forces React to remount it on
// every navigation, which re-triggers the .page-slide-in CSS animation —
// giving each route a fresh slide-in instead of content just snapping
// into place.
function AnimatedRoutes() {
  const location = useLocation();

  return (
    <div key={location.pathname} className="page-slide-in">
      <Routes location={location}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/groups/:id" element={<GroupDetail />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/advisor" element={<AIAdvisorPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AnimatedRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
