import useUnitsStore, { Unit, Task, TaskRun } from "../store/unitStore";

// Helper functions that use the Zustand store

export function getSelectedUnits(): string[] {
  return useUnitsStore.getState().selectedUnitIds;
}

export function saveSelectedUnits(unitIds: string[]) {
  useUnitsStore.getState().setSelectedUnits(unitIds);
}

export function getTaskHistory(): TaskRun[] {
  return useUnitsStore.getState().taskHistory;
}

export function saveTaskRun(taskRun: TaskRun) {
  useUnitsStore.getState().addTaskRun(taskRun);
}

export function updateTaskRun(taskRunId: string, updates: Partial<TaskRun>) {
  useUnitsStore.getState().updateTaskRun(taskRunId, updates);
}

export function getUnitById(unitId: string) {
  return useUnitsStore
    .getState()
    .availableUnits.find((unit) => unit.id === unitId);
}

export function getTaskById(unitId: string, taskId: string) {
  const tasks = useUnitsStore.getState().unitTasks[unitId];
  return tasks?.find((task) => task.id === taskId);
}
