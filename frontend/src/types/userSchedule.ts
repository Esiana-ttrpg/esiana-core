export type UserSchedulePreferences = {
  vacationStartDate: string | null;
  vacationEndDate: string | null;
  autoRsvpEnabled: boolean;
  autoRsvpDaysBefore: number | null;
};

export type AttendanceAwaitingMember = {
  userId: string;
  label: string;
  away: boolean;
};

export type AttendanceSummary = {
  attending: number;
  notAttending: number;
  awaiting: number;
  total: number;
  awaitingMembers: AttendanceAwaitingMember[];
};

export type PreviousSessionRef = {
  sessionNumber: number;
  plannedStartAt: string | null;
  deepLinkPath: string;
};

export type MaterializedScheduleEntry = {
  kind: 'MATERIALIZED';
  id: string;
  campaignId: string;
  campaignHandle: string;
  campaignName: string;
  appearanceProfile: unknown;
  timelinePointId: string;
  sessionTitle: string;
  sessionNumber: number;
  status: string;
  skipReason: string | null;
  plannedStartAt: string | null;
  plannedEndAt: string | null;
  timezone: string | null;
  deepLinkPath: string;
  myAttendance: string | null;
  away: boolean;
  attendanceSummary: AttendanceSummary | null;
  previousSession: PreviousSessionRef | null;
};

export type ProjectedScheduleEntry = {
  kind: 'PROJECTED';
  id: string;
  campaignId: string;
  campaignHandle: string;
  campaignName: string;
  appearanceProfile: unknown;
  plannedStartAt: string;
  timezone: string | null;
};

export type UserScheduleEntry = MaterializedScheduleEntry | ProjectedScheduleEntry;

export type UserScheduleResponse = {
  preferences: UserSchedulePreferences;
  entries: UserScheduleEntry[];
  upcoming: MaterializedScheduleEntry[];
};
