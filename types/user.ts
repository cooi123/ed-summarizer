import { Unit } from "./unit";
export type UnitSync = {
  unit_id: string;
  last_sync: string | null;
};
export type User = {
  id: string;
  email: string;
  name: string;
  selectedUnits: UnitSync[];
  availableUnits: Unit[];
  apiKey?: string;
};
