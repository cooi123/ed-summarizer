"use client";

import type React from "react";
import { SignIn } from "@clerk/nextjs";

export function LoginForm() {
  return (
    <SignIn 
      forceRedirectUrl="/dashboard"
      appearance={{
        elements: {
          formButtonPrimary: 
            "bg-black hover:bg-black/90 text-white",
          card: "bg-white shadow-none",
          headerTitle: "text-black text-2xl font-bold",
          headerSubtitle: "text-black/70",
          socialButtonsBlockButton: 
            "border border-input bg-white text-black hover:bg-gray-100",
          formFieldLabel: "text-black",
          formFieldInput: 
            "border border-input bg-white text-black",
          footerActionLink: "text-black hover:text-black/70",
          formFieldAction: "text-black hover:text-black/70",
          identityPreviewEditButton: "text-black hover:text-black/70",
          formFieldInputShowPasswordButton: "text-black/70 hover:text-black",
          alertText: "text-destructive",
          alertIcon: "text-destructive",
          footerAction: "text-black hover:text-black/70",
          footerActionText: "text-black/70",
        },
        layout: {
          socialButtonsPlacement: "bottom",
          socialButtonsVariant: "blockButton",
          privacyPageUrl: "/privacy",
          termsPageUrl: "/terms",
        },
      }}
    />
  );
}
