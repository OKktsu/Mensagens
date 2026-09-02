import { useState, useCallback } from "react";
import { AuthUser, login as apiLogin, register as apiRegister } from "../services/api";

const tokenStorageKey = "mensagens:token";
const userStorageKey = "mensagens:user";

function getStoredUser(): AuthUser | null {
  try {
    const storedUser = localStorage.getItem(userStorageKey);
    return storedUser ? (JSON.parse(storedUser) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(tokenStorageKey));
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getStoredUser());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError("");
    try {
      const response = await apiLogin(email, password);
      localStorage.setItem(tokenStorageKey, response.token);
      localStorage.setItem(userStorageKey, JSON.stringify(response.user));
      setToken(response.token);
      setCurrentUser(response.user);
      return response;
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Não foi possível entrar.";
      setError(message);
      throw caughtError;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    setIsLoading(true);
    setError("");
    try {
      const response = await apiRegister(name, email, password);
      localStorage.setItem(tokenStorageKey, response.token);
      localStorage.setItem(userStorageKey, JSON.stringify(response.user));
      setToken(response.token);
      setCurrentUser(response.user);
      return response;
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Não foi possível cadastrar.";
      setError(message);
      throw caughtError;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(tokenStorageKey);
    localStorage.removeItem(userStorageKey);
    setToken(null);
    setCurrentUser(null);
    setError("");
  }, []);

  const clearError = useCallback(() => {
    setError("");
  }, []);

  return {
    token,
    currentUser,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError,
  };
}
