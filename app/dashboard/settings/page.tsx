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
import { useUser } from "@clerk/nextjs";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Save } from "lucide-react";
import { apiService } from "@/lib/api";

export default function SettingsPage() {
  const { toast } = useToast();
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
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  // Get available units and currently selected unit IDs from user store
  const availableUnits = user?.availableUnits || [];
  const selectedUnits = user?.selectedUnits || [];

  // Merge available units with selected units that might be archived
  const mergedUnits = [...availableUnits];
  selectedUnits.forEach(selectedUnit => {
    if (!mergedUnits.some(unit => unit.id === selectedUnit.id)) {
      mergedUnits.push(selectedUnit);
    }
  });

  // Get selected unit IDs for easier comparison
  const selectedUnitIds = selectedUnits.map((unit) => unit.id.toString());

  // // Fetch user data once when component mounts
  // useEffect(() => {
  //   fetchUser();
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [user]);

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
  const handleToggleUnit = (unitId: number) => {
    const unitIdStr = unitId.toString();
    setLocalSelectedUnits((prev) =>
      prev.includes(unitIdStr)
        ? prev.filter((id) => id !== unitIdStr)
        : [...prev, unitIdStr]
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
      // Transform string IDs into UnitSync objects by finding the full unit data
      const selectedUnitObjects: UnitSync[] = localSelectedUnits.map(
        (unitId) => {
          const unit = user.availableUnits.find(
            (u) => u.id.toString() === unitId
          );
          if (!unit) {
            throw new Error(`Unit with ID ${unitId} not found in available units`);
          }
          return unit;
        }
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
    setApiKeyError(null);
    //test the api key using ed forum route   
    try {
      const testApiKey = await apiService.post<{ valid: boolean }, { apiKey: string }>('/proxy/ed-forum/validate-key', {
        apiKey
      });

      if (!testApiKey.valid) {
        setApiKeyError("Invalid API key. Please check and try again.");
        return;
      }
      setIsApiKeySaving(true);

      await updateUserApiKey(apiKey);

      toast({
        title: "API Key Updated",
        description: "Your API key has been saved successfully.",
      });
    } catch (error) {
      console.error("Error saving API key:", error);
      setApiKeyError("Failed to validate API key. Please try again.");
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
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      setApiKeyError(null); // Clear error when user types
                    }}
                    placeholder="Enter your API key"
                    className={`pr-10 ${apiKeyError ? 'border-red-500' : ''}`}
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
              {apiKeyError && (
                <p className="text-sm text-red-500 mt-1">{apiKeyError}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unit Selection Section */}
      <Card>
        <CardHeader>
          <CardTitle>Unit Selection</CardTitle>
          <CardDescription>
            Select the units you want to work with. Archived units are marked with an asterisk (*).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mergedUnits.map((unit) => {
              const isArchived = !availableUnits.some(availUnit => availUnit.id === unit.id);
              return (
                <div
                  key={unit.id}
                  className="flex items-start space-x-3 space-y-0"
                >
                  <Checkbox
                    id={unit.id.toString()}
                    checked={localSelectedUnits.includes(unit.id.toString())}
                    onCheckedChange={() => handleToggleUnit(unit.id)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor={unit.id.toString()}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {unit.code}: {unit.name} {isArchived && "*"}
                    </label>
                    <p className="text-sm text-muted-foreground">
                      {unit.year} - {unit.session}
                      {isArchived && " (Archived)"}
                    </p>
                  </div>
                </div>
              );
            })}

            {mergedUnits.length === 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  No units available. This could be because:
                </p>
                <ul className="list-disc pl-5 text-sm text-muted-foreground">
                  <li>Your API key hasn't been provided or is invalid</li>
                  <li>You don't have access to any units</li>
                  <li>There was an error fetching your units</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-2">
                  Please check your API key above and try again.
                </p>
              </div>
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
