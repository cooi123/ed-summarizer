"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useUnitQuestionCluster } from "@/hooks/useUnitQuestionCluster";
import { QuestionGroup } from "./question-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Unit } from "@/types/unit";

interface Question {
  id: string;
  content: string;
  title: string;
  is_answered: boolean;
  needs_attention: boolean;
  vote_count: number;
  url: string;
}




export function QuestionClusterGroup({ unit }: { unit: Unit }) {
    if (!unit){
        return <div>Unit not found</div>
    }
  const {
    clusters,
    pagination,
    isLoading,
    error,
    nextPage,
    previousPage,
    currentPage,
    selectedWeek,
    setWeek,
    availableWeeks,
  } = useUnitQuestionCluster(unit.id.toString(), unit.weeks);

  if (isLoading) {
    return <div>Loading clusters...</div>;
  }

  if (error) {
    return <div>Error loading clusters: {error.message}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Question Clusters</h2>
          <Select
            value={selectedWeek !== null ? selectedWeek.toString() : "all"}
            onValueChange={(value) => setWeek(value === "all" ? null : parseInt(value))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by week" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Weeks</SelectItem>
              {availableWeeks.map((week) => (
                <SelectItem key={week} value={week.toString()}>
                  Week {week}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={previousPage}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {currentPage} of {pagination?.total_pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={nextPage}
            disabled={currentPage === pagination?.total_pages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {clusters.length>0?clusters.map((cluster) => (
          <QuestionGroup
            key={cluster.theme}
            theme={cluster.theme}
            summary={cluster.summary}
            questions={cluster.questions}
            week={cluster.week}
            transactionIds={cluster.transactionIds}
            metadata={cluster.metadata}

            
          />
        )): <div>No clusters found! Please generate weekly analysis first.</div>}
      </div>
    </div>
  );
} 