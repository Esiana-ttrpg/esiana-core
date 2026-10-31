/** Starting points only: category identity is always the campaign's saved ID. */
export const DEFAULT_EVENT_CATEGORIES = [
  { name: 'Conflict', color: '#dc2626', icon: 'swords' },
  { name: 'Politics', color: '#7c3aed', icon: 'landmark' },
  { name: 'Society', color: '#0891b2', icon: 'users' },
  { name: 'Discovery', color: '#16a34a', icon: 'compass' },
  { name: 'Crisis', color: '#ea580c', icon: 'triangle-alert' },
  { name: 'Mystery', color: '#4f46e5', icon: 'search' },
  { name: 'Personal', color: '#db2777', icon: 'heart' },
  { name: 'Birthdays', color: '#ca8a04', icon: 'cake' },
  { name: 'Power', color: '#0d9488', icon: 'crown' },
] as const;
