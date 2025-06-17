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
import { useToast } from "@/hooks/use-toast";
import useUserStore from "@/store/userStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Dashboard() {
  const { user, loading, updating, fetchUser } = useUserStore();
  const selectedUnits = user?.selectedUnits || [];
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedSession, setSelectedSession] = useState<string>("all");

  // Get unique years and sessions from units
  const years = Array.from(new Set(selectedUnits.map(unit => unit.year))).sort().reverse();
  const sessions = Array.from(new Set(selectedUnits.map(unit => unit.session))).sort();

  // Filter units based on selected year and session
  const filteredUnits = selectedUnits.filter(unit => {
    const yearMatch = selectedYear === "all" || unit.year === selectedYear;
    const sessionMatch = selectedSession === "all" || unit.session === selectedSession;
    return yearMatch && sessionMatch;
  });

  // Show empty state if no units are selected
  if (selectedUnits.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to your unit management dashboard
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
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to your unit Ed-Forum management dashboard. Select a unit to view its details.
        </p>
      </div>

      <div className="flex gap-4 items-center">
        <div className="w-[200px]">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger>
              <SelectValue placeholder="Select Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {years.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-[200px]">
          <Select value={selectedSession} onValueChange={setSelectedSession}>
            <SelectTrigger>
              <SelectValue placeholder="Select Session" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sessions</SelectItem>
              {sessions.map((session) => (
                <SelectItem key={session} value={session}>
                  {session}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="text-sm text-muted-foreground">
          Showing {filteredUnits.length} of {selectedUnits.length} units
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredUnits.map((unit) => (
          <Card key={unit.id} className="flex flex-col h-[280px]">
            <CardHeader className="flex-none">
              <CardTitle className="truncate" title={`${unit.code}: ${unit.name}`}>
                {unit.code}: {unit.name}
              </CardTitle>
              <CardDescription>
                {unit.year} - {unit.session}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Threads:</span>
                  {/* <span className="font-medium">{unit.threadCount || 0}</span> */}
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Last Updated:</span>
                  <span className="font-medium">
                    {/* {unit.updatedAt ? new Date(unit.updatedAt).toLocaleDateString() : 'Never'} */}
                  </span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex-none">
              <Button asChild className="w-full">
                <Link href={`/dashboard/units/${unit.id}`}>View Unit Details</Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
