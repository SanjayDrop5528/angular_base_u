import { RoasterType } from '../../enums/enum';

export interface Calendar {
  id: string;
  userId: string;
  userName: string;
  userColor?: string;
  startTime: Date;
  endTime: Date;
  notes?: string;
  roasterType?: RoasterType;
  status?: string;
  entityType?: string;
  roasterConfigId?: string;
  windowId?: string;
  caseId?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  color?: string;
  entityType?: string;
}

/** A single time session window (e.g. Morning 09:00–13:00) */
export interface AvailabilityWindow {
  id?: string;
  roasterConfigId?: string;
  startTime: string;      // "HH:MM"
  endTime: string;        // "HH:MM"
  slotDuration: number;   // minutes
  generateSlots: boolean;
  sequenceNo: number;
}

/** Full availability schedule config sent to / received from backend */
export interface RoasterConfigPayload {
  id?: string;
  userId: string;
  availabilityType: 'single' | 'range' | 'recurring';
  roasterType?: string;
  freq?: string;
  intervalVal?: number;
  byDay?: string;           // "MO,WE,FR"
  dayOfMonth?: number;
  weekNumber?: string;      // first/second/third/fourth/last
  weekDay?: string;         // MO–SU
  startDate: string;        // ISO date
  endDate?: string;
  occurrenceCount?: number;
  status?: string;
  notes?: string;
  windows: AvailabilityWindow[];
}
