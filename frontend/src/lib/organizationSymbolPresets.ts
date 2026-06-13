import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  CircleDot,
  Coins,
  Crown,
  Eye,
  Flame,
  Flower2,
  Scale,
  Shield,
  Skull,
  Swords,
  Waves,
} from 'lucide-react';
import type { OrganizationSymbolPreset } from '@/lib/organizationMetadata';

export const SYMBOL_PRESET_ICONS: Record<OrganizationSymbolPreset, LucideIcon> = {
  crescent: CircleDot,
  coin: Coins,
  spear: Swords,
  tome: BookOpen,
  banner: Shield,
  crown: Crown,
  scale: Scale,
  flame: Flame,
  wave: Waves,
  eye: Eye,
  rose: Flower2,
  skull: Skull,
};

export const SYMBOL_PRESET_LABELS: Record<OrganizationSymbolPreset, string> = {
  crescent: 'Crescent',
  coin: 'Coin',
  spear: 'Spear',
  tome: 'Tome',
  banner: 'Banner',
  crown: 'Crown',
  scale: 'Scale',
  flame: 'Flame',
  wave: 'Wave',
  eye: 'Eye',
  rose: 'Rose',
  skull: 'Skull',
};

export const SYMBOL_PRESET_DEFAULT_TINTS: Partial<Record<OrganizationSymbolPreset, string>> = {
  crescent: '#7c3aed',
  coin: '#ca8a04',
  spear: '#dc2626',
  tome: '#2563eb',
  banner: '#059669',
  crown: '#d97706',
  scale: '#64748b',
  flame: '#ea580c',
  wave: '#0891b2',
  eye: '#6366f1',
  rose: '#db2777',
  skull: '#525252',
};

export function resolveDoctrineTint(
  preset: OrganizationSymbolPreset | null,
  doctrineTint: string | null,
): string | null {
  if (doctrineTint) return doctrineTint;
  if (preset) return SYMBOL_PRESET_DEFAULT_TINTS[preset] ?? null;
  return null;
}
