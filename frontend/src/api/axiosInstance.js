import axios from "axios";

// Base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

// Client principale (con interceptor)
export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // necessario per inviare i cookie HttpOnly (refresh)
});

// Client senza interceptor (per la /refresh)
const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

//Helper exportato per il silent refresh all’avvio
export const refreshToken = () => refreshClient.post("/api/utenti/refresh", {});

//Supplier per leggere/salvare il token dall'AuthContext
let getAccessToken = () => null;           // viene impostato dall'AuthContext
let onTokenRefreshed = (token) => {};      // idem

export const setAccessTokenSupplier = (fn) => (getAccessToken = fn);
export const setOnTokenRefreshed = (fn) => (onTokenRefreshed = fn);

//Coda richieste mentre il refresh è in corso
let isRefreshing = false;
let pendingRequests = [];

const processQueue = (error, token = null) => {
  pendingRequests.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  pendingRequests = [];
};

//Request Interceptor: aggiunge Bearer se presente
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken?.();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (!original || original._retry) {
      return Promise.reject(error);
    }

    if (error.response && error.response.status === 401) {
      // Se già in refresh: mettiti in coda e attendi il nuovo token
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingRequests.push({
            resolve: (token) => {
              original.headers.Authorization = `Bearer ${token}`;
              resolve(api(original));
            },
            reject: (err) => reject(err),
          });
        });
      }

      // Primo 401 -> avvia refresh
      original._retry = true;
      isRefreshing = true;

      try {
        const { data } = await refreshClient.post("/api/utenti/refresh", {});
        const newToken = data?.accessToken;
        if (!newToken) throw new Error("Nessun accessToken dal refresh");

        // Avvisa il Context
        onTokenRefreshed(newToken);

        // Sblocca la coda
        processQueue(null, newToken);

        // Ritenta la richiesta
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);