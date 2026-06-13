export interface ScheduledSystemJobDefinition {
  id: string;
  taskName: string;
  schedule: string;
  description: string;
  scope: string;
}

export const SCHEDULED_SYSTEM_JOBS: ScheduledSystemJobDefinition[] = [
  {
    id: 'import-staging-retention',
    taskName: 'Asset Janitor Sweep',
    schedule: 'Every 24 hours',
    description:
      'Deletes expired import staging uploads (Obsidian ZIP, Esiana backup ZIP) 3 days after upload.',
    scope: 'System',
  },
  {
    id: 'notification-sweep',
    taskName: 'Notification sweep',
    schedule: 'Every 15 minutes',
    description:
      'Sends 24-hour session reminders and expires pending ownership transfer offers.',
    scope: 'System',
  },
];
