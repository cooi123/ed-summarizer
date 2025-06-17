"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useUnitStore } from "@/store/unitStore";
import { QuestionClusterGroup } from "@/components/unit/question-cluster/question-cluster-group";

export default function QuestionClustersPage() {
  const params = useParams();
  const unitId = params.unitId as string;

  // Get unit data from store
  const unit = useUnitStore((state) => state.unit);
  const unitLoading = useUnitStore((state) => state.isLoading);
  const fetchUnit = useUnitStore((state) => state.fetchUnit);

  // Fetch unit data on mount
  useEffect(() => {
    fetchUnit(unitId);
  }, [unitId, fetchUnit]);

  if (unitLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Loading...</h1>
          <p className="text-muted-foreground">Please wait</p>
        </div>
      </div>
    );
  }

  if (!unit) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Question Clusters</h2>
        <p className="text-muted-foreground">
          View and analyze clusters of questions grouped by common themes, filtered by weeks. This helps identify patterns and recurring topics in student questions.
        </p>
      </div>
      <QuestionClusterGroup unit={unit} />
    </div>
  );
} 