"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SignupForm } from "@/components/signup-form";
import { apiEndpoints } from "@/const/apiEndpoints";
import useUserStore from "@/store/userStore";

export default function SignupPage() {
  const { user: clerkUser } = useUser();
  const { fetchUser, needsSignup, loading } = useUserStore();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      if (clerkUser) {
        await fetchUser();
      }
      setIsChecking(false);
    };
    checkUser();
  }, [clerkUser, fetchUser]);

  // Only redirect if we're done checking and don't need signup
  if (!isChecking && !loading && !needsSignup) {
    router.push("/dashboard");
    return null;
  }

  // Show loading state while checking
  if (isChecking || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-muted/40">
      <SignupForm />
    </main>
  );
} 