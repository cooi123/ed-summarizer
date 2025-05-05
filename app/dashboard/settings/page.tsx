"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import useUnitsStore from "@/store/unitStore";
import { UnitSync, useAuth } from "@/components/auth-provider";

export default function SettingsPage() {
  const { availableUnits, selectedUnitIds, fetchUnits, saveSelectedUnits } =
    useUnitsStore();
  const [localSelectedUnits, setLocalSelectedUnits] = useState<string[]>([]);
  const { toast } = useToast();
  const { user, updateUser } = useAuth();

  // Fetch units when component loads
  useEffect(() => {
    if (user) {
      fetchUnits(user);
    }
  }, [user, fetchUnits]);
  console.log("local selected" + localSelectedUnits);
  // Initialize local state with the store's selected units
  useEffect(() => {
    setLocalSelectedUnits(selectedUnitIds);
  }, [selectedUnitIds]);

  // Handle local toggle of units
  const handleToggleUnit = (unitId: string) => {
    setLocalSelectedUnits((prev) =>
      prev.includes(unitId)
        ? prev.filter((id) => id !== unitId)
        : [...prev, unitId]
    );
  };
  // Save preferences to backend
  const handleSavePreferences = async () => {
    if (user && user.id) {
      // Update the backend
      saveSelectedUnits(user.id, localSelectedUnits);

      // Transform string IDs into UnitSync objects
      const selectedUnitObjects: UnitSync[] = localSelectedUnits.map(
        (unitId) => ({
          unit_id: unitId,
          last_sync: null,
        })
      );

      // Update the user in auth context
      updateUser({ selectedUnits: selectedUnitObjects });

      toast({
        title: "Preferences saved",
        description: "Your unit preferences have been saved successfully.",
      });
    } else {
      toast({
        title: "Error",
        description: "User not found. Please log in again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your unit preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Unit Selection</CardTitle>
          <CardDescription>
            Select the units you want to work with
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {availableUnits.map((unit) => (
              <div
                key={unit.id}
                className="flex items-start space-x-3 space-y-0"
              >
                <Checkbox
                  id={unit.id}
                  checked={localSelectedUnits.includes(unit.id)}
                  onCheckedChange={() => handleToggleUnit(unit.id)}
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor={unit.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {unit.code}: {unit.name}
                  </label>
                  <p className="text-sm text-muted-foreground">
                    {unit.year} - {unit.session}
                  </p>
                </div>
              </div>
            ))}

            {availableUnits.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No units available. Please contact your administrator.
              </p>
            )}

            <Button onClick={handleSavePreferences} className="mt-6">
              Save Preferences
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
