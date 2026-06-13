import { Search } from 'lucide-react';

interface HubThemedSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function HubThemedSearch({
  value,
  onChange,
  placeholder = 'Search campaigns…',
  className = '',
}: HubThemedSearchProps) {
  return (
    <div className={`hub-search relative flex-1 ${className}`.trim()}>
      <Search className="hub-search__icon pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="hub-search__input"
      />
    </div>
  );
}
