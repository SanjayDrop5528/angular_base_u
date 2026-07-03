export enum UserRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  USER = 'user',
  BUDDY = 'buddy',
  PATIENT = 'patient',
  DOCTOR = 'doctor'
}

export type RoleType = 'owner' | 'admin' | 'user' | 'buddy' | 'patient' | 'doctor';

export enum CalendarView {
  MONTH = 'month',
  WEEK = 'week',
  DAY = 'day'
}

export enum RecurrenceType {
  NONE = 'none',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly'
}

export enum RoasterType {
  VISIT = 'visit',
  CONSULTATION = 'consultation'
}

export enum AvailabilityType {
  SINGLE    = 'single',
  RANGE     = 'range',
  RECURRING = 'recurring'
}

export enum MonthlyPattern {
  DAY_OF_MONTH = 'day_of_month',
  WEEK_DAY     = 'week_day'
}

export enum WeekNumber {
  FIRST  = 'first',
  SECOND = 'second',
  THIRD  = 'third',
  FOURTH = 'fourth',
  LAST   = 'last'
}
