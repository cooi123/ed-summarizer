"use client";

import type React from "react";
import { SignIn } from "@clerk/nextjs";

export function LoginForm() {
  return (

        <SignIn 
          appearance={{
            elements: {
              formButtonPrimary: 
                "bg-primary hover:bg-primary/90 text-primary-foreground",
              card: "bg-primary shadow-none",
              headerTitle: "text-2xl font-bold text-foreground",
              headerSubtitle: "text-muted-foreground",
              socialButtonsBlockButton: 
                "border border-input bg- hover:bg-accent hover:text-accent-foreground",
              formFieldLabel: "text-foreground",
              formFieldInput: 
                "border border-input bg-background text-foreground",
              footerActionLink: "text-primary hover:text-primary/90",
              formFieldAction: "text-primary hover:text-primary/90",
              identityPreviewEditButton: "text-primary hover:text-primary/90",
              formFieldInputShowPasswordButton: "text-muted-foreground hover:text-foreground",
              alertText: "text-destructive",
              alertIcon: "text-destructive",
              
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
