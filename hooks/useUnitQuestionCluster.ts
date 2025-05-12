import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiEndpoints } from '@/const/apiEndpoints';
import { apiService } from '@/lib/api';
import { isWithinInterval } from 'date-fns';

interface Question {
  id: string;
  content: string;
  title: string;
  is_answered: boolean;
  needs_attention: boolean;
  vote_count: number;
  url: string;
}

interface WeekConfig {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
}

interface Cluster {
  theme: string;
  summary: string;
  questions: Question[];
  weekStart: string;
  weekEnd: string;
  transactionIds: string[];
  metadata: Record<string, any>;
}

interface Pagination {
  current_page: number;
  page_size: number;
  total_clusters: number;
  total_pages: number;
}

interface QuestionClusterResponse {
  unitId: string;
  clusters: Cluster[];
  pagination: Pagination;
}

// Function to get week number based on unit's week configuration
function getWeekNumber(clusterWeekStart: Date, weeks?: WeekConfig[]): number {
  if (!weeks?.length) return 0;

  const sortedWeeks = [...weeks].sort((a, b) =>
    new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );
console.log("clusterWeekStart", clusterWeekStart)
  const matchingWeek = sortedWeeks.find((weekConfig) => {
    //ignore time
    const weekStart = new Date(weekConfig.startDate).setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekConfig.endDate).setHours(0, 0, 0, 0);
    const clusterWeekStartDate = new Date(clusterWeekStart).setHours(0, 0, 0, 0);
    return isWithinInterval(clusterWeekStartDate, { start: weekStart, end: weekEnd });
  });


  if (matchingWeek) {
    return matchingWeek.weekNumber;
  }

  return 0;
}

export function useUnitQuestionCluster(unitId: string, weeks?: WeekConfig[]) {
  const [page, setPage] = useState(1);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const pageSize = 10;

  const fetchClusters = useCallback(async () => {
    const response = await apiService.get<QuestionClusterResponse>(
      `${apiEndpoints.units.getQuestionClusters(unitId)}?page=${page}&page_size=${pageSize}`
    );
    return response;
  }, [unitId, page]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['questionClusters', unitId, page],
    queryFn: fetchClusters,
  });

  // Calculate week numbers for clusters and sort them by week
  const clustersWithWeek = (data?.clusters.map(cluster => ({
    ...cluster,
    week: getWeekNumber(new Date(cluster.weekStart), weeks)
  })) ?? []).sort((a, b) => (a.week ?? Infinity) - (b.week ?? Infinity));

  // Derive available weeks (from unit configuration if provided, else from clusters)
  const availableWeeks = weeks
    ? Array.from(new Set(weeks.map((wc) => wc.weekNumber))).sort((a, b) => a - b)
    : Array.from(
        new Set(
          clustersWithWeek.map((c) => c.week).filter((w): w is number => w != null)
        )
      ).sort((a, b) => a - b);

  // Filter by selected week if needed
  const filteredClusters = selectedWeek
    ? clustersWithWeek.filter((cluster) => cluster.week === selectedWeek)
    : clustersWithWeek;

  const nextPage = useCallback(() => {
    if (data?.pagination?.current_page && data?.pagination?.total_pages && 
        data.pagination.current_page < data.pagination.total_pages) {
      setPage((prev) => prev + 1);
    }
  }, [data?.pagination]);

  const previousPage = useCallback(() => {
    if (page > 1) {
      setPage((prev) => prev - 1);
    }
  }, [page]);

  const setWeek = useCallback((week: number | null) => {
    setSelectedWeek(week);
    setPage(1); // Reset to first page when changing week
  }, []);

  return {
    clusters: filteredClusters,
    pagination: data?.pagination,
    isLoading,
    error,
    nextPage,
    previousPage,
    currentPage: page,
    selectedWeek,
    setWeek,
    availableWeeks,
  };
} 