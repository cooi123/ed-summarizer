import { Unit } from "./unit";

export type UnitSync = {
  id: number;
  code: string;
  name: string;
  year: string;
  session: string;
  status: string;
  created_at: string;
  last_active: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  apiKey: string;
  selectedUnits: UnitSync[];
  availableUnits: UnitSync[];
  previousUnits: UnitSync[];
};
