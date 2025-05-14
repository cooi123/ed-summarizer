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

interface Phase {
  type: string;
  start_date: string;
  end_date: string;
}

interface Semester {
  id: number;
  year: number;
  semester: number;
  phases: Phase[];
}

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
      const data = await apiService.get<Semester[]>('/semesters/');
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
    
    // Generate weeks based on the teaching period phase
    const teachingPeriod = semester.phases.find(p => p.type === 'teaching_period');
    if (!teachingPeriod) {
      toast({
        title: "Error",
        description: "No teaching period found in selected semester.",
        variant: "destructive",
      });
      return;
    }

    const startDate = new Date(teachingPeriod.start_date);
    const endDate = new Date(teachingPeriod.end_date);
    
    // Calculate number of weeks
    const weeksDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
    
    // Generate initial weeks
    let generatedWeeks = generateWeeks(
      startDate,
      weeksDiff,
      undefined,
      0
    );

    // Sort breaks by start date
    const breaks = semester.phases
      .filter(p => p.type === 'mid_semester_break' || p.type === 'swot_vac')
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

    // Process each break
    for (const breakPhase of breaks) {
      const breakStart = new Date(breakPhase.start_date);
      const breakEnd = new Date(breakPhase.end_date);
      
      // Find the week that contains the break start date
      const breakWeekIndex = generatedWeeks.findIndex(week => 
        new Date(week.startDate) <= breakStart && new Date(week.endDate) >= breakStart
      );

      if (breakWeekIndex !== -1) {
        // Split the week at the break
        const week = generatedWeeks[breakWeekIndex];
        const beforeBreak = {
          ...week,
          endDate: new Date(breakStart.getTime() - 24 * 60 * 60 * 1000),
        };
        const afterBreak = {
          ...week,
          weekNumber: week.weekNumber + 1,
          startDate: new Date(breakEnd.getTime() + 24 * 60 * 60 * 1000),
        };

        // Update the weeks array
        generatedWeeks.splice(breakWeekIndex, 1, beforeBreak);
        generatedWeeks.splice(breakWeekIndex + 1, 0, afterBreak);
      }
    }

    // Renumber weeks sequentially, skipping breaks
    let weekNumber = 1;
    generatedWeeks = generatedWeeks.map(week => {
      // Check if this week contains a break
      const hasBreak = breaks.some(breakPhase => {
        const breakStart = new Date(breakPhase.start_date);
        const breakEnd = new Date(breakPhase.end_date);
        return (
          new Date(week.startDate) <= breakEnd &&
          new Date(week.endDate) >= breakStart
        );
      });

      if (hasBreak) {
        return {
          ...week,
          weekNumber: 0, // Mark break weeks with 0
          isBreak: true,
          breakType: breaks.find(breakPhase => {
            const breakStart = new Date(breakPhase.start_date);
            const breakEnd = new Date(breakPhase.end_date);
            return (
              new Date(week.startDate) <= breakEnd &&
              new Date(week.endDate) >= breakStart
            );
          })?.type
        };
      }

      return {
        ...week,
        weekNumber: weekNumber++
      };
    });

    try {
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
      console.error('Failed to update weeks:', error);
      toast({
        title: "Error",
        description: "Failed to save the generated weeks. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select Semester</DialogTitle>
          <DialogDescription>
            Choose a year and semester to generate the week configuration
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