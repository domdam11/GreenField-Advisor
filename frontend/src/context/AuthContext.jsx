import React, { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, setAccessTokenSupplier, setOnTokenRefreshed } from "../api/axiosInstance";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // --- PATCH: token gestito anche in localStorage
  const [accessToken, setAccessTokenState] = useState(() => localStorage.getItem("accessToken") || null);
  const [user, setUser] = useState(null); 
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

    // Getter/setter globale per axios
  useEffect(() => {
    setAccessTokenSupplier(() => accessToken); // PATCH: funzione supplier
    setOnTokenRefreshed((newToken) => {
      setAccessToken(newToken);
    });
  }, [accessToken]);

  // Patch: salva anche in localStorage
  const setAccessToken = (token) => {
    setAccessTokenState(token);
    if (token) {
      localStorage.setItem("accessToken", token);
    } else {
      localStorage.removeItem("accessToken");
    }
  };

  // Silent refresh all’avvio: recupera user da backend (se token valido)
  useEffect(() => {
    let canceled = false;
    setLoading(true);
    (async () => {
      try {
        // --- PATCH: recupera token da localStorage
        const storedToken = localStorage.getItem("accessToken");
        if (!storedToken) {
          setAccessToken(null);
          setUser(null);
          setLoading(false);
          return;
        }
        setAccessToken(storedToken);
        // Chiedi se il token è ancora valido
        const me = await api.get("/api/utenti/me");
        if (!canceled && me?.data?.utente) {
          setUser(me.data.utente);
        }
      } catch (e) {
        if (!canceled) {
          setAccessToken(null);
          setUser(null);
        }
      } finally {
        if (!canceled) setLoading(false);
      }
    })();
    return () => {
      canceled = true;
    };
  }, []);

  // Azioni login/logout
  const login = async (emailOrUsername, password) => {
    setLoading(true);
    try {
      // Il backend accetta sia email che username
      const payload = { password };
      if (emailOrUsername.includes("@")) payload.email = emailOrUsername;
      else payload.username = emailOrUsername;
      const res = await api.post("/api/utenti/login", payload);
      setAccessToken(res.data.accessToken);
      setUser(res.data.utente);
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err.response?.data?.detail || "Errore login",
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post("/api/utenti/logout");
    } catch {}
    setAccessToken(null);
    setUser(null);
    navigate("/", { replace: true });
  };

  const value = {
    user,
    accessToken,
    loading,
    isAuthenticated: !!user && !!accessToken,
    login,
    logout,
    setUser, 
    setAccessToken, 
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
