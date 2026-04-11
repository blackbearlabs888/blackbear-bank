'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { INDONESIAN_CITIES } from '@/lib/indonesia-cities';

interface CitySearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function CitySearch({
  value,
  onChange,
  placeholder = 'Cari kota...',
  disabled = false,
  className,
}: CitySearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Get all cities as array (memoized)
  const allCities = useMemo(() => Object.keys(INDONESIAN_CITIES).sort(), []);

  // Filter cities based on search (memoized)
  const filteredCities = useMemo(() => {
    const query = search || value;
    return query
      ? allCities.filter(city =>
          city.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 50) // Limit to 50 results
      : allCities.slice(0, 50); // Show first 50 if no search
  }, [search, value, allCities]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle city selection
  const handleSelect = (city: string) => {
    onChange(city);
    setSearch('');
    setIsOpen(false);
    inputRef.current?.blur();
    setHighlightedIndex(0);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredCities.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCities[highlightedIndex]) {
          handleSelect(filteredCities[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearch('');
        setHighlightedIndex(0);
        break;
    }
  };

  // Handle search input change
  const handleSearchChange = (newValue: string) => {
    setSearch(newValue);
    setIsOpen(true);
    setHighlightedIndex(0);
    // Also update parent value so form has the current input
    onChange(newValue);
  };

  // Handle blur - sync search to value if needed
  const handleBlur = () => {
    // Small delay to allow click events on dropdown items
    setTimeout(() => {
      if (search && !value) {
        // If user typed but didn't select, use their input
        onChange(search);
      }
      setSearch('');
    }, 150);
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          value={search || value}
          onChange={(e) => handleSearchChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-10 pr-10"
        />
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      </div>

      {isOpen && filteredCities.length > 0 && (
        <div
          ref={listRef}
          className="absolute z-50 w-full mt-1 max-h-60 overflow-auto rounded-lg border bg-popover shadow-lg"
        >
          {filteredCities.map((city, index) => {
            const cityData = INDONESIAN_CITIES[city];
            return (
              <div
                key={city}
                onClick={() => handleSelect(city)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={cn(
                  'px-3 py-2 cursor-pointer flex items-center justify-between',
                  'hover:bg-accent',
                  index === highlightedIndex && 'bg-accent',
                  city.toLowerCase() === value.toLowerCase() && 'bg-primary/10'
                )}
              >
                <div className="flex flex-col">
                  <span className="font-medium capitalize">
                    {city}
                  </span>
                  {cityData?.province && (
                    <span className="text-xs text-muted-foreground">
                      {cityData.province}
                    </span>
                  )}
                </div>
                {cityData?.island && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    {cityData.island}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isOpen && (search || value) && filteredCities.length === 0 && (
        <div className="absolute z-50 w-full mt-1 p-4 rounded-lg border bg-popover shadow-lg text-center text-muted-foreground">
          <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Kota tidak ditemukan</p>
          <p className="text-xs mt-1">Pencarian: "{search || value}"</p>
        </div>
      )}
    </div>
  );
}
