import { Cake, Compass, Crown, Heart, Landmark, Search, Swords, Tag, TriangleAlert, Users } from 'lucide-react';
import type { TimelineCategoryRecord } from '@/lib/chronologyApi';

const icons = { cake: Cake, compass: Compass, crown: Crown, heart: Heart, landmark: Landmark, search: Search, swords: Swords, 'triangle-alert': TriangleAlert, users: Users };

export function ChronologyCategoryLabel({ category }: { category?: TimelineCategoryRecord }) {
  const Icon = icons[category?.icon as keyof typeof icons] ?? Tag;
  return <span className="inline-flex items-center gap-1"><Icon className="size-3 shrink-0" style={{ color: category?.color ?? undefined }} aria-hidden="true" />{category?.name ?? 'Uncategorized'}</span>;
}
