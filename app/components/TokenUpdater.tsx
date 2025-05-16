"use client";

import { useAuth } from '@clerk/nextjs';
import { useEffect } from "react";
import { setAuthToken } from "@/lib/api";

export function TokenUpdater() {
  const { getToken } = useAuth();

  useEffect(() => {
    const updateToken = async () => {
      const token = await getToken();
      setAuthToken(token);
    };
    
    // Initial token update
    updateToken();

    // Set up interval to update token every 5 minutes
    const intervalId = setInterval(updateToken, 1 * 60 * 1000);

    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, [getToken]);

  return null;
} 