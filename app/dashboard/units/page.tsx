"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import useUnitsStore from "@/store/unitStore";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/hooks/use-toast";

export default function UnitsPage() {
  const { selectedUnitIds, availableUnits, fetchUnits } = useUnitsStore();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  // Fetch units when component loads
  useEffect(() => {
    async function loadUnits() {
      if (user) {
        setIsLoading(true);
        try {
          await fetchUnits(user);
        } catch (error) {
          toast({
            title: "Error fetching units",
            description: "Could not load your units. Please try again.",
            variant: "destructive",
          });
          console.error("Failed to fetch units:", error);
        } finally {
          setIsLoading(false);
        }
      }
    }

    loadUnits();
  }, [user, fetchUnits, toast]);
  // Get currently selected units - with null safety
  const selectedUnits =
    availableUnits?.filter((unit) => selectedUnitIds?.includes(unit.id)) || [];

  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Units</h1>
          <p className="text-muted-foreground">Loading your units...</p>
        </div>
      </div>
    );
  }

  // Show empty state if no units are selected
  if (selectedUnits.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Units</h1>
          <p className="text-muted-foreground">
            View and manage your selected units
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>No Units Selected</CardTitle>
            <CardDescription>
              You haven't selected any units yet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Go to settings to select units you want to work with</p>
          </CardContent>
          <CardFooter>
            <Button asChild>
              <Link href="/dashboard/settings">Go to Settings</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Units</h1>
        <p className="text-muted-foreground">
          View and manage your selected units
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {selectedUnits.map((unit) => (
          <Card key={unit.id}>
            <CardHeader>
              <CardTitle>
                {unit.code}: {unit.name}
              </CardTitle>
              <CardDescription>
                {unit.year} - {unit.session}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Click below to view tasks and run operations
              </p>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href={`/dashboard/units/${unit.id}`}>View Unit</Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
