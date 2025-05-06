"use client";
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
import useUserStore from "@/store/userStore";

export default function UnitsPage() {
  const { user } = useUserStore();
  const selectedUnitIds = user?.selectedUnits || [];
  const availableUnits = user?.availableUnits || [];
  const selectedUnits = availableUnits.filter((unit) =>
    selectedUnitIds.some((selectedUnit) => selectedUnit.unit_id === unit.id)
  );

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
