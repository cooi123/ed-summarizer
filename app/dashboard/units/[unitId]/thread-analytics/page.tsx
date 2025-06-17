"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/lib/api";
import { apiEndpoints } from "@/const/apiEndpoints";
import { useUnitStore } from "@/store/unitStore";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import useUserStore from "@/store/userStore";

interface Thread {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  is_answered: boolean;
  needs_attention: boolean;
  themes: string[];
  last_sync_at: string;
  unique_views: number;
  vote_count: number;
  thread_type: string;
  category: string;
  subcategory: string;
  subsubcategory: string;
  user_id: number;
}

interface ThreadData {
  unit_id: string;
  unit_name: string;
  threads: Thread[];
  pagination: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
}

interface WeeklyData {
  week: string;
  weekNumber: number;
  count: number;
  answered: number;
  unanswered: number;
  themes: Record<string, number>;
  categories: Record<string, number>;
}

export default function ThreadAnalyticsPage() {
  const params = useParams();
  const { toast } = useToast();
  const [threadData, setThreadData] = useState<ThreadData | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const { user } = useUserStore();
  const { unit, fetchUnit } = useUnitStore();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);

  const fetchThreadData = async () => {
    try {
      setLoading(true);
      const threadData = await apiService.get<ThreadData>(
        apiEndpoints.units.getThreads(params.unitId as string)
      );
      setThreadData(threadData);
      processThreadData(threadData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch thread data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncThreads = async () => {
    try {
      setSyncing(true);
      await apiService.post(apiEndpoints.units.syncThreads(params.unitId as string, user?.id || ""));
      await fetchThreadData();
      toast({
        title: "Success",
        description: "Threads synchronized successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sync threads",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchUnit(params.unitId as string);
    fetchThreadData();
  }, [params.unitId]);
  const processThreadData = (data: ThreadData) => {
    const weeklyCounts: Record<string, WeeklyData> = {};

    // Find the earliest thread date
    const earliestDate = new Date(Math.min(...data.threads.map(thread => new Date(thread.created_at).getTime())));
    
    // Adjust to previous Monday
    const newStartDate = new Date(earliestDate);
    const day = newStartDate.getDay();
    const diff = newStartDate.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    newStartDate.setDate(diff);
    newStartDate.setHours(0, 0, 0, 0);
    setStartDate(newStartDate);

    data.threads.forEach((thread) => {
      const date = new Date(thread.created_at);
      
      // Calculate week number based on days from start date
      const daysDiff = Math.floor((date.getTime() - newStartDate.getTime()) / (1000 * 60 * 60 * 24));
      const weekNumber = Math.floor(daysDiff / 7) + 1;
      const weekKey = `Week ${weekNumber}`;

      if (!weeklyCounts[weekKey]) {
        weeklyCounts[weekKey] = {
          week: weekKey,
          weekNumber: weekNumber,
          count: 0,
          answered: 0,
          unanswered: 0,
          themes: {},
          categories: {},
        };
      }

      weeklyCounts[weekKey].count++;
      
      // Count answered/unanswered
      if (thread.is_answered) {
        weeklyCounts[weekKey].answered++;
      } else {
        weeklyCounts[weekKey].unanswered++;
      }
      
      // Count themes (filter out empty strings)
      thread.themes.filter(theme => theme).forEach((theme) => {
        weeklyCounts[weekKey].themes[theme] = (weeklyCounts[weekKey].themes[theme] || 0) + 1;
      });

      // Count categories
      if (thread.category) {
        weeklyCounts[weekKey].categories[thread.category] = (weeklyCounts[weekKey].categories[thread.category] || 0) + 1;
      }
    });

    // Convert to array and sort by week number
    const sortedData = Object.values(weeklyCounts).sort((a, b) => 
      a.weekNumber - b.weekNumber
    );

    setWeeklyData(sortedData);
  };

  console.log("weeklyData", weeklyData)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Loading thread analytics...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Thread Analytics</h1>
        <Button 
          onClick={handleSyncThreads} 
          disabled={syncing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync Threads'}
        </Button>
      </div>
      {threadData && (
        <Card>
          <CardHeader>
            <CardTitle>{threadData.unit_name} - Thread Frequency by Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[500px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="week" 
                    tickFormatter={(value) => {
                      const data = weeklyData.find(d => d.week === value);
                      return `Week ${data?.weekNumber || 'N/A'}`;
                    }}
                  />
                  <YAxis />
                  <Tooltip
                    content={({ active, payload, label }: TooltipProps<number, string>) => {
                      if (active && payload && payload.length && startDate) {
                        const data = payload[0].payload as WeeklyData;
                        const weekStart = new Date(startDate);
                        weekStart.setDate(startDate.getDate() + (data.weekNumber - 1) * 7);
                        const weekEnd = new Date(weekStart);
                        weekEnd.setDate(weekStart.getDate() + 6);
                        
                        return (
                          <div className="bg-white p-4 border rounded shadow">
                            <p className="font-bold">Week {data.weekNumber}</p>
                            <p className="text-sm text-gray-500">
                              {weekStart.toLocaleDateString()} - {weekEnd.toLocaleDateString()}
                            </p>
                            <p>Total Threads: {data.count}</p>
                            <p>Answered: {data.answered}</p>
                            <p>Unanswered: {data.unanswered}</p>
                            <div className="mt-2">
                              <p className="font-semibold">Themes:</p>
                              {Object.entries(data.themes).map(([theme, count]) => (
                                <p key={theme}>{theme}: {count}</p>
                              ))}
                            </div>
                            <div className="mt-2">
                              <p className="font-semibold">Categories:</p>
                              {Object.entries(data.categories).map(([category, count]) => (
                                <p key={category}>{category}: {count}</p>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Bar dataKey="answered" name="Answered Threads" fill="#4CAF50" stackId="a" />
                  <Bar dataKey="unanswered" name="Unanswered Threads" fill="#FFA726" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 