import { Plus } from 'lucide-react';
import { UserAvatar } from '@/components/ui/UserAvatar';
import type { PublicTablePlayer } from '@/types/recruitment';
import { getLobbyTableCapacity } from '@shared/recruitmentSeats';

interface TableSeatRowProps {
  tablePlayers: PublicTablePlayer[];
  filledSeats: number;
  maxSeats: number;
  maxPlayers: number;
  isFull: boolean;
  ariaLabel: string;
}

const SLOT_SIZE = 'size-9';

function AnonymousFilledSlot({ index }: { index: number }) {
  return (
    <span
      key={`anon-${index}`}
      className={`${SLOT_SIZE} shrink-0 rounded-full border-2 border-primary/50 bg-primary/20`}
      aria-hidden
    />
  );
}

function EmptySlot({ index }: { index: number }) {
  return (
    <span
      key={`open-${index}`}
      className={`${SLOT_SIZE} inline-flex shrink-0 items-center justify-center rounded-full border-2 border-dashed border-border bg-background/40 text-muted`}
      aria-hidden
    >
      <Plus className="size-4" strokeWidth={2} />
    </span>
  );
}

export function TableSeatRow({
  tablePlayers,
  filledSeats,
  maxSeats,
  maxPlayers,
  isFull,
  ariaLabel,
}: TableSeatRowProps) {
  const capacity = getLobbyTableCapacity({ maxSeats, maxPlayers });
  const players = tablePlayers;
  const anonymousCount =
    players.length === 0 && filledSeats > 0 ? filledSeats : 0;
  const openSlots =
    isFull || capacity <= 0 ? 0 : Math.max(0, capacity - filledSeats);

  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      role="group"
      aria-label={ariaLabel}
    >
        {players.map((player) => (
          <span key={player.id} title={player.label} className="shrink-0">
            <UserAvatar
              name={player.label}
              avatarUrl={player.avatarUrl}
              userId={player.id}
              size="sm"
            />
          </span>
        ))}
        {Array.from({ length: anonymousCount }, (_, i) => (
          <AnonymousFilledSlot key={`anon-${i}`} index={i} />
        ))}
        {Array.from({ length: openSlots }, (_, i) => (
          <EmptySlot key={`open-${i}`} index={i} />
        ))}
    </div>
  );
}
