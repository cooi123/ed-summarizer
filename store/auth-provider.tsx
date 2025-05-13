"use client";

import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User } from "@/types/user";
import useUserStore from "./userStore";

type AuthState = {
  user: User | null;
  setUser: (user: User | null) => void;
};

// Create a Zustand store with persist middleware
const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
    }),
    {
      name: "auth-storage", // name for the storage key
    }
  )
);

type AuthContextType = {
  user: User | null;
  login: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, setUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

  useEffect(() => {
    // No need to check localStorage - Zustand's persist handles this
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Redirect logic
    if (!isLoading) {
      const isLoginPage = pathname === "/";

      if (!user && !isLoginPage && pathname !== "/") {
        router.push("/");
      } else if (user && isLoginPage) {
        router.push("/dashboard");
      }
    }
  }, [user, isLoading, pathname, router]);

  const login = async (email: string) => {
    try {
      setIsLoading(true);
      // query api to validate user
      const res = await fetch(`${BASE_URL}/users/?email=${email}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error("Failed to login");
      }

      const userData = await res.json();

      setUser(userData);
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setUser(null);
    useUserStore.getState().clearUserData();
    router.push("/");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
