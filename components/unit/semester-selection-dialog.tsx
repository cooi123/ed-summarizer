import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/lib/api";
import { generateWeeks } from "@/util/shared";
import { WeekConfig } from "@/types/unit";
import { updateAllWeeks } from "@/store/unitStore";
import { format } from "date-fns";
import { Calendar, BookOpen, Coffee, GraduationCap, FileText } from "lucide-react";
import { generateWeeksFromSemester, Semester, SemesterPhase } from "@/util/semester";
import { apiEndpoints } from "@/const/apiEndpoints";

interface SemesterSelectionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  unitId: string;
  onWeeksGenerated: (weeks: WeekConfig[]) => void;
}

const getPhaseIcon = (type: string) => {
  switch (type) {
    case 'teaching_period':
      return <BookOpen className="h-4 w-4" />;
    case 'mid_semester_break':
      return <Coffee className="h-4 w-4" />;
    case 'swot_vac':
      return <GraduationCap className="h-4 w-4" />;
    case 'final_assessments':
      return <FileText className="h-4 w-4" />;
    default:
      return <Calendar className="h-4 w-4" />;
  }
};

const getPhaseLabel = (type: string) => {
  switch (type) {
    case 'teaching_period':
      return 'Teaching Period';
    case 'mid_semester_break':
      return 'Mid-Semester Break';
    case 'swot_vac':
      return 'SWOT VAC';
    case 'final_assessments':
      return 'Final Assessments';
    default:
      return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
};

export function SemesterSelectionDialog({
  isOpen,
  onOpenChange,
  unitId,
  onWeeksGenerated,
}: SemesterSelectionDialogProps) {
  const { toast } = useToast();
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [isLoadingSemesters, setIsLoadingSemesters] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedSemester, setSelectedSemester] = useState<string>("");

  // Get unique years and semesters from the data
  const years = [...new Set(semesters.map(s => s.year))].sort((a, b) => b - a);
  const semestersForYear = semesters.filter(s => s.year.toString() === selectedYear);
  const selectedSemesterData = semesters.find(
    s => s.year.toString() === selectedYear && s.semester.toString() === selectedSemester
  );

  // Fetch semesters when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchSemesters();
    }
  }, [isOpen]);

  // Reset selections when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedYear("");
      setSelectedSemester("");
    }
  }, [isOpen]);

  const fetchSemesters = async () => {
    setIsLoadingSemesters(true);
    try {
      const data = await apiService.get<Semester[]>(apiEndpoints.units.getSemesters());
      setSemesters(data);
    } catch (error) {
      console.error('Failed to fetch semesters:', error);
      toast({
        title: "Error",
        description: "Failed to fetch semester data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSemesters(false);
    }
  };

  const handleYearSelect = (year: string) => {
    setSelectedYear(year);
    setSelectedSemester(""); // Reset semester when year changes
  };

  const handleSemesterSelect = (semester: string) => {
    setSelectedSemester(semester);
  };

  const handleConfirm = async () => {
    if (!selectedYear || !selectedSemester) {
      toast({
        title: "Selection Required",
        description: "Please select both year and semester",
        variant: "destructive",
      });
      return;
    }

    const semester = semesters.find(
      s => s.year.toString() === selectedYear && s.semester.toString() === selectedSemester
    );
    
    if (!semester) return;

    try {
      // Generate weeks using the shared utility
      const generatedWeeks = generateWeeksFromSemester(semester);
      console.log('generatedWeeks', generatedWeeks);
      // Update the weeks in the backend
      await updateAllWeeks(unitId, generatedWeeks);
      
      // Notify parent component
      onWeeksGenerated(generatedWeeks);
      
      // Close dialog
      onOpenChange(false);

      toast({
        title: "Semester Selected",
        description: `Weeks have been generated for ${semester.year} Semester ${semester.semester}`,
      });
    } catch (error) {
      console.error('Failed to generate weeks:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate weeks. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select Semester</DialogTitle>
          <DialogDescription className="space-y-4">
            <p>Choose a year and semester this unit is running in.</p>
            <div className="mt-4 space-y-3 text-sm">
              <p className="font-medium">After selecting the semester, you can:</p>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Complete unit information in the <span className="text-primary">Unit Settings</span> tab</li>
                <li>Sync threads from Ed Forum to get started</li>
                <li>Run weekly thread analysis to:
                  <ul className="list-disc list-inside ml-4 mt-1">
                    <li>Generate FAQs</li>
                    <li>Create question clusters (viewable in Question Cluster tab)</li>
                  </ul>
                </li>
                <li>Run assessment analysis for deeper insights</li>
              </ol>
            </div>
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-6">
          {isLoadingSemesters ? (
            <div className="flex items-center justify-center py-4">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Year</label>
                  <Select value={selectedYear} onValueChange={handleYearSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Semester</label>
                  <Select 
                    value={selectedSemester} 
                    onValueChange={handleSemesterSelect}
                    disabled={!selectedYear}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select semester" />
                    </SelectTrigger>
                    <SelectContent>
                      {semestersForYear.map((sem) => (
                        <SelectItem key={sem.semester} value={sem.semester.toString()}>
                          Semester {sem.semester}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedSemesterData && (
                <div className="space-y-4">
                  <h3 className="font-medium">Semester Phases</h3>
                  <div className="grid gap-3">
                    {selectedSemesterData.phases.map((phase, index) => (
                      <div
                        key={phase.type}
                        className="flex items-center p-3 rounded-lg border bg-card"
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 mr-3">
                          {getPhaseIcon(phase.type)}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{getPhaseLabel(phase.type)}</div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(phase.start_date), "MMM d")} -{" "}
                            {format(new Date(phase.end_date), "MMM d, yyyy")}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!selectedYear || !selectedSemester}
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 