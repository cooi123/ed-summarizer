"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WeekConfig } from "@/types/unit";
import { UnitWeekConfigurator } from "./unit-week-configurator";
import {
  updateUnitDetails,
  updateAllWeeks,
  useUnitStore,
} from "@/store/unitStore";

interface UnitSettingsProps {
  unit: {
    id?: string;
    code: string;
    name: string;
    description?: string;
    content?: string;
    year: number;
    session: string;
    weeks?: WeekConfig[];
  };
  unitId: string;
}

export function UnitSettings({ unit, unitId }: UnitSettingsProps) {
  const { toast } = useToast();
  const [description, setDescription] = useState(unit.description || "");
  const [content, setContent] = useState(unit.content || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [unitDetails, setUnitDetails] = useState({
    code: unit.code,
    name: unit.name,
  });
  const [weeks, setWeeks] = useState<WeekConfig[]>(unit.weeks || []);

  // Get the error state from the unit store to show any errors
  const storeError = useUnitStore((state) => state.error);
  const isUpdating = useUnitStore((state) => state.isUpdating);
  const clearError = useUnitStore((state) => state.clearError);

  // Clear any store errors when component unmounts
  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  // Show toast when store error changes
  useEffect(() => {
    if (storeError) {
      toast({
        title: "Update Failed",
        description: storeError,
        variant: "destructive",
      });
      clearError();
    }
  }, [storeError, toast, clearError]);

  const handleSubmit = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      // Prepare weeks data with proper date formatting
      const formattedWeeks = weeks.map((week) => ({
        ...week,
        weekNumber: week.weekNumber,
        startDate: new Date(week.startDate), // Ensure it's a Date object
        endDate: new Date(week.endDate), // Ensure it's a Date object
      }));

      // Use different actions based on which tab is active
      if (activeTab === "general") {
        // Update unit details only
        await updateUnitDetails(unitId, {
          description,
          content,
        });
      } else if (activeTab === "weeks") {
        // Update weeks only
        await updateAllWeeks(unitId, formattedWeeks);
      } else {
        // Update both (if needed)
        await updateUnitDetails(unitId, {
          description,
          content,
        });
        await updateAllWeeks(unitId, formattedWeeks);
      }

      toast({
        title: "Settings Updated",
        description: "Unit settings have been successfully updated.",
      });
    } catch (error) {
      console.error("Failed to update unit settings:", error);
      toast({
        title: "Update Failed",
        description: "There was an error updating the unit settings.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="general">General Information</TabsTrigger>
          <TabsTrigger value="weeks">Week Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Unit Information</CardTitle>
              <CardDescription>
                View and update basic information about this unit.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unitCode">Unit Code</Label>
                  <Input
                    id="unitCode"
                    value={unitDetails.code}
                    readOnly
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unitName">Unit Name</Label>
                  <Input
                    id="unitName"
                    value={unitDetails.name}
                    readOnly
                    disabled
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="unitDescription">Unit Description</Label>
                <Textarea
                  id="unitDescription"
                  placeholder="Enter a brief description of the unit..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>

              <Separator className="my-4" />

              <div className="space-y-2">
                <Label htmlFor="unitContent">Unit Content</Label>
                <Textarea
                  id="unitContent"
                  placeholder="Enter detailed unit content and learning outcomes..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || isUpdating}
                  size="lg"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSubmitting || isUpdating
                    ? "Saving..."
                    : "Save All Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weeks" className="space-y-6">
          <UnitWeekConfigurator weeks={weeks} unitId={unitId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
