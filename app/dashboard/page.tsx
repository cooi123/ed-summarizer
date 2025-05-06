"use client";

import { useEffect } from "react";
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
import { useToast } from "@/hooks/use-toast";
import useUserStore from "@/store/userStore";

export default function Dashboard() {
  const { user, loading, updating, fetchUser } = useUserStore();
  const selectedUnitIds = user?.selectedUnits || [];
  const availableUnits = user?.availableUnits || [];
  const selectedUnits = availableUnits.filter((unit) =>
    selectedUnitIds.some((selectedUnit) => selectedUnit.unit_id === unit.id)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to your unit management dashboard
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">My Units</CardTitle>
            <CardDescription>
              You have {selectedUnits.length} units selected
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Manage your selected units and run tasks</p>
            {selectedUnits.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm">
                {selectedUnits.slice(0, 3).map((unit) => (
                  <li key={unit.id} className="text-muted-foreground">
                    {unit.code}: {unit.name}
                  </li>
                ))}
                {selectedUnits.length > 3 && (
                  <li className="text-muted-foreground">
                    ...and {selectedUnits.length - 3} more
                  </li>
                )}
              </ul>
            )}
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/dashboard/units">View Units</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Settings</CardTitle>
            <CardDescription>Configure your unit preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Select which units you want to work with</p>
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/settings">Settings</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
