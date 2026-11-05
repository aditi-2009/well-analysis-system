import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { fetchCurrentUser, loginUser, logoutUser, registerUser } from "../services/authService";
import { getToken } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(() => Boolean(getToken())); // checking a saved token

  // On first load: if a token is saved, confirm it is still valid.
  useEffect(() => {
    if (!getToken()) return;
    let alive = true;
    fetchCurrentUser()
      .then((u) => alive && setUser(u))
      .catch(() => { /* 401 handler already cleared the token */ })
      .finally(() => alive && setBooting(false));
    return () => { alive = false; };
  }, []);

  // api.js fires this when the server rejects the token (expired / revoked)
  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener("auth:expired", onExpired);
    return () => window.removeEventListener("auth:expired", onExpired);
  }, []);

  const login = useCallback(async (credentials) => {
    const u = await loginUser(credentials);
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (form) => {
    await registerUser(form);
    // The backend returns no token on register, so sign in straight away.
    return login({ email: form.email, password: form.password, remember: true });
  }, [login]);

  const logout = useCallback(() => {
    logoutUser();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, booting, isAuthenticated: Boolean(user), login, register, logout }),
    [user, booting, login, register, logout]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
