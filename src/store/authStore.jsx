/**
 * store/authStore.js
 * Global auth state menggunakan React Context API
 * Menyimpan: user info, token, loading state, fungsi login/logout
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import apiClient, { loginRequest } from "../utils/apiClient";

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // cek localStorage saat mount

  // ── Hydrate dari localStorage saat app pertama load ──────────────────────
  useEffect(() => {
    const savedToken = localStorage.getItem("access_token");
    const savedUser = localStorage.getItem("sib_user");

    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(parsedUser);
      } catch {
        // localStorage corrupt → clear
        localStorage.removeItem("access_token");
        localStorage.removeItem("sib_user");
      }
    }
    setIsLoading(false);
  }, []);

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const response = await loginRequest(email, password);
    const { access_token } = response.data;

    // Simpan token
    localStorage.setItem("access_token", access_token);
    setToken(access_token);

    // Ambil info user — simpan minimal info dari token atau buat placeholder
    // (API ini tidak punya GET /me endpoint, jadi kita simpan email sebagai info dasar)
    const userInfo = { email };
    localStorage.setItem("sib_user", JSON.stringify(userInfo));
    setUser(userInfo);

    return response.data;
  }, []);

  // ── Register ──────────────────────────────────────────────────────────────
  const register = useCallback(async (formData) => {
    const response = await apiClient.post("/api/v1/auth/register", formData);
    return response.data;
  }, []);

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("sib_user");
    setToken(null);
    setUser(null);
  }, []);

  // ── Computed ──────────────────────────────────────────────────────────────
  const isAuthenticated = !!token;

  const value = {
    user,
    token,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
  };

  if (isLoading) {
    // Kamu bisa me-return null agar layar kosong sebentar,
    // atau mengembalikan animasi spinner loading
    return null;
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
