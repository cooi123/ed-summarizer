import { useState, useEffect } from 'react';
import { apiService } from '@/lib/api';
import { apiEndpoints } from '@/const/apiEndpoints';

export function useBackendHealth() {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const checkHealth = async () => {
      try {
        // Try to make a simple GET request to check if backend is up
        await apiService.get(apiEndpoints.health.get());
        setIsHealthy(true);
        // Clear the interval once we confirm backend is healthy
        if (intervalId) {
          clearInterval(intervalId);
        }
      } catch (error) {
        setIsHealthy(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkHealth();

    // Only set up polling if backend is not healthy
    if (!isHealthy) {
      intervalId = setInterval(checkHealth, 5000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isHealthy]); // Add isHealthy to dependencies to re-run effect when it changes

  return { isHealthy, isChecking };
} 