import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api, { setAccessToken } from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true while checking for an existing session

  // On first load, try to silently restore a session using the refresh
  // cookie (e.g. user closed the tab and came back). If it fails, they're
  // just logged out — that's expected, not an error to surface.
  useEffect(() => {
    async function restoreSession() {
      try {
        const { data } = await api.post("/auth/refresh");
        setAccessToken(data.accessToken);
        const meRes = await api.get("/auth/me");
        setUser(meRes.data.user);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    restoreSession();
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
  }, []);

  const register = useCallback(async (name, email, password) => {
    const { data } = await api.post("/auth/register", { name, email, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    await api.post("/auth/logout");
    setAccessToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
