import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiService } from "@/lib/api";
import { apiEndpoints } from "@/const/apiEndpoints";
import { useToast } from "@/hooks/use-toast";
import useUserStore from "@/store/userStore";
import { WeekConfig } from "@/types/unit";
import { TaskRun } from "@/store/taskStore";
import { useTaskStore } from "@/store/taskStore";
import { useEffect } from "react";

interface Thread {
  id: string;
  created_at: string;
  is_answered: boolean;
}

interface WeekData {
  weekId: number;
  teachingWeekNumber: number;
  weekType: string;
  startDate: string;
  endDate: string;
  content: string;
  threadCount: number;
  faqReports: TaskRun[];
}

interface UnitWeekData {
  unit_id: string;
  unit_name: string;
  weeks: WeekData[];
}

// Query key factory
const queryKeys = {
  unitWeeks: (unitId: string) => ['unitWeeks', unitId],
};

// Fetch unit weeks data
const fetchUnitWeeks = async (unitId: string): Promise<UnitWeekData> => {
  const response = await apiService.get<UnitWeekData>(
    `${apiEndpoints.units.getWeeklyData(unitId)}`
  );
  return response;
};

export function useUnitThreads(unitId: string, weeks: WeekConfig[], taskRuns: TaskRun[]) {
  const { toast } = useToast();
  const { user } = useUserStore();
  const queryClient = useQueryClient();
  const { currentTaskRun } = useTaskStore();

  // Query for fetching unit weeks data
  const { data: unitWeeksData, isLoading } = useQuery<UnitWeekData>({
    queryKey: queryKeys.unitWeeks(unitId),
    queryFn: () => fetchUnitWeeks(unitId),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });

  // Effect to refetch when a task is completed
  useEffect(() => {
    if (currentTaskRun?.status === "completed") {
      queryClient.invalidateQueries({ queryKey: queryKeys.unitWeeks(unitId) });
    }
  }, [currentTaskRun?.status, queryClient, unitId]);

  // Mutation for syncing threads
  const syncThreadsMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("User not found");
      await apiService.post(
        apiEndpoints.units.syncThreads(unitId, user.id)
      );
    },
    onSuccess: () => {
      // Invalidate the query to trigger a refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.unitWeeks(unitId) });
      toast({
        title: "Success",
        description: "Threads synchronized successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to sync threads",
        variant: "destructive",
      });
    },
  });

  const handleSyncThreads = () => {
    syncThreadsMutation.mutate();
    queryClient.invalidateQueries({ queryKey: queryKeys.unitWeeks(unitId) });
    toast({
      title: "Success",
      description: "Unit threads updated successfully",
    });
  };

  // Transform the data to match the expected format
  const weeklyData = unitWeeksData?.weeks.map(weekData => ({
    weekId: weekData.weekId,
    teachingWeekNumber: weekData.teachingWeekNumber,
    weekType: weekData.weekType,
    startDate: weekData.startDate,
    endDate: weekData.endDate,
    content: weekData.content,
    threadCount: weekData.threadCount,
    faqReports: weekData.faqReports,
  })) || [];

  return {
    weeklyData,
    isLoading,
    isSyncing: syncThreadsMutation.isPending,
    handleSyncThreads,
  };
} 