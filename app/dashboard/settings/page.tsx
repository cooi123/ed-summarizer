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
import useUserStore from "@/store/userStore";
import { UnitSync } from "@/types/user";
import { useAuth } from "@/store/auth-provider";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Save } from "lucide-react";

export default function SettingsPage() {
  const { toast } = useToast();
  const { user: authUser } = useAuth();
  const {
    user,
    loading,
    updating,
    fetchUser,
    updateSelectedUnits,
    updateUserApiKey,
  } = useUserStore();

  // Local state for managing unit selections before saving
  const [localSelectedUnits, setLocalSelectedUnits] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // API Key states
  const [apiKey, setApiKey] = useState("");
  const [isApiKeySaving, setIsApiKeySaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Get available units and currently selected unit IDs from user store
  const availableUnits = user?.availableUnits || [];

  // Get selected unit IDs for easier comparison
  const selectedUnitIds =
    user?.selectedUnits?.map((unit) => unit.unit_id) || [];

  // Fetch user data once when component mounts
  useEffect(() => {
    // Store email in a variable to prevent it from changing in the dependency array
    const email = authUser?.email || "";

    // Only fetch if email exists and user data isn't already loaded
    if (email && !user) {
      fetchUser(email);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize local state with the store's selected units when user data changes
  useEffect(() => {
    // Only update local state if it doesn't match the current selectedUnitIds
    if (
      user &&
      JSON.stringify(localSelectedUnits) !== JSON.stringify(selectedUnitIds)
    ) {
      setLocalSelectedUnits(selectedUnitIds);
    }

    // Set API key if available
    if (user?.apiKey) {
      setApiKey(user.apiKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Handle local toggle of units
  const handleToggleUnit = (unitId: string) => {
    setLocalSelectedUnits((prev) =>
      prev.includes(unitId)
        ? prev.filter((id) => id !== unitId)
        : [...prev, unitId]
    );
  };

  // Save preferences to backend via UserStore
  const handleSavePreferences = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "User not found. Please log in again.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      // Transform string IDs into UnitSync objects
      const selectedUnitObjects: UnitSync[] = localSelectedUnits.map(
        (unitId) => ({
          unit_id: unitId,
          // Preserve last_sync value if unit was previously selected
          last_sync:
            user.selectedUnits.find((u) => u.unit_id === unitId)?.last_sync ||
            null,
        })
      );

      // Update the user in store (which will update the backend)
      await updateSelectedUnits(selectedUnitObjects);

      toast({
        title: "Preferences saved",
        description: "Your unit preferences have been saved successfully.",
      });
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Save API key to backend via UserStore
  const handleSaveApiKey = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "User not found. Please log in again.",
        variant: "destructive",
      });
      return;
    }

    setIsApiKeySaving(true);

    try {
      await updateUserApiKey(apiKey);

      toast({
        title: "API Key Updated",
        description: "Your API key has been saved successfully.",
      });
    } catch (error) {
      console.error("Error saving API key:", error);
      toast({
        title: "Error",
        description: "Failed to save API key. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsApiKeySaving(false);
    }
  };

  // Show loading state
  if (loading && !user) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your unit preferences</p>
      </div>

      {/* API Key Section */}
      <Card>
        <CardHeader>
          <CardTitle>API Key</CardTitle>
          <CardDescription>
            Update Your ED forum API key. Your API key provides access to Ed
            Forum services.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4">
              <div className="flex space-x-2">
                <div className="relative flex-grow">
                  <Input
                    type={showApiKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your API key"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <Button
                  onClick={handleSaveApiKey}
                  disabled={
                    isApiKeySaving ||
                    updating ||
                    apiKey === user?.apiKey ||
                    !apiKey
                  }
                >
                  {isApiKeySaving || updating ? (
                    <>Saving</>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save API Key
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unit Selection Section */}
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

            <div className="pt-6">
              <Button
                onClick={handleSavePreferences}
                disabled={
                  isSaving ||
                  updating ||
                  JSON.stringify(localSelectedUnits.sort()) ===
                    JSON.stringify(selectedUnitIds.sort())
                }
              >
                {isSaving || updating ? "Saving..." : "Save Preferences"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
