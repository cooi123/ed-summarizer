"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SignupForm } from "@/components/signup-form";
import { apiEndpoints } from "@/const/apiEndpoints";
import useUserStore from "@/store/userStore";

export default function SignupPage() {
  const { user:clerkUser } = useUser();
  const { fetchUser, needsSignup } = useUserStore();
  const router = useRouter();
  if (!clerkUser) {
    router.push("/");
    return null;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-muted/40">
      <SignupForm />
    </main>
  );
} 