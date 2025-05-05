"use client";

import { useState } from "react";
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
import axios from "axios";

interface UnitSettingsProps {
  unit: {
    id?: string;
    code: string;
    name: string;
    description?: string;
    content?: string;
    year: number;
    session: string;
  };
  unitId: string;
}

export function UnitSettings({ unit, unitId }: UnitSettingsProps) {
  const { toast } = useToast();
  const [description, setDescription] = useState(unit.description || "");
  const [content, setContent] = useState(unit.content || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unitDetails, setUnitDetails] = useState({
    code: unit.code,
    name: unit.name,
  });

  const handleSubmit = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      // Update endpoint - adjust according to your API
      const BASE_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

      await axios.patch(`${BASE_URL}/users/units/${unitId}`, {
        description,
        content,
      });

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
              <Input id="unitCode" value={unitDetails.code} readOnly disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unitName">Unit Name</Label>
              <Input id="unitName" value={unitDetails.name} readOnly disabled />
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
            <p className="text-sm text-muted-foreground">
              You can use markdown to format the content.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>
            Preview how your unit content will appear to users.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="prose dark:prose-invert max-w-none">
            <h2>
              {unit.code}: {unit.name}
            </h2>
            <p className="italic">{description}</p>
            <div dangerouslySetInnerHTML={{ __html: content }} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
