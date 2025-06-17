"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { UserNav } from "@/components/user-nav";
import useUserStore from "@/store/userStore";
import { useBackendHealth } from "@/hooks/useBackendHealth";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const { fetchUser, needsSignup, loading } = useUserStore();
  const [isChecking, setIsChecking] = useState(true);
  const { isHealthy, isChecking: isHealthChecking } = useBackendHealth();

  // Check if we're on the home page
  const isHomePage = pathname === "/dashboard";

  useEffect(() => {
    const checkUser = async () => {
      if (isLoaded) {
        if (!user) {
          router.push("/");
        } else if (needsSignup) {
          router.push("/signup");
        } else {
          await fetchUser();
        }
        setIsChecking(false);
      }
    };
    checkUser();
  }, [user, isLoaded, needsSignup, router, fetchUser]);

  // Show loading state while checking
  if (!isLoaded || loading || isChecking || isHealthChecking) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show backend cold start message
  if (isHealthy === false) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Backend is starting up, please wait...</p>
          <p className="text-xs text-muted-foreground mt-1">This may take a few moments</p>
        </div>
      </div>
    );
  }

  // Don't render anything if no user
  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b bg-background">
        <div className="flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard" 
              className="font-semibold hover:text-primary transition-colors"
            >
              Ed-Summariser
            </Link>
            {!isHomePage && (
              <div className="h-6 w-px bg-border" />
            )}
          </div>
          <div className="flex items-center space-x-4">
            <UserNav />
          </div>
        </div>
      </header>
      <main className="flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}
