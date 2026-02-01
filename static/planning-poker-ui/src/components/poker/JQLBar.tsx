import React from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface JQLBarProps {
  onSearch?: (jql: string) => void;
  loading?: boolean;
  initialValue?: string;
}

export function JQLBar({ onSearch, loading, initialValue }: JQLBarProps) {
  const [value, setValue] = React.useState(initialValue || "");

  // Update local state if initialValue changes (e.g. from session load)
  React.useEffect(() => {
      if (initialValue) setValue(initialValue);
  }, [initialValue]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch(value);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1 max-w-lg">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
        <Input 
          placeholder="Filter issues (JQL supported)" 
          className="pl-9 h-9 bg-white text-sm"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
      </div>
      <div className="flex items-center gap-2">
        <Button 
            variant="ghost" 
            size="sm" 
            className="h-9 text-slate-500"
            onClick={() => onSearch && onSearch(value)}
            disabled={loading}
        >
          <Filter className="w-4 h-4 mr-2" />
          Apply Filter
        </Button>
      </div>
    </div>
  );
}
