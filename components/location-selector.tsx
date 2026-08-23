'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  ALL_LOCATIONS,
  BROAD_REGIONS,
  LocationItem,
  detectBrowserLocation,
} from '@/data/world-locations';
import {
  MapPin,
  Search,
  Check,
  Globe,
  Sparkles,
  ChevronDown,
  Navigation,
} from 'lucide-react';

interface LocationSelectorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
}

type RegionFilter = 'All' | 'India & South Asia' | 'Remote / Broad' | 'Asia-Pacific' | 'Europe' | 'Americas' | 'Africa & Middle East';

export function LocationSelector({ value, onChange, error }: LocationSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<RegionFilter>('All');
  const [isDetecting, setIsDetecting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter locations based on search query and region tab
  const filteredLocations = ALL_LOCATIONS.filter(item => {
    // Region tab filter
    if (selectedRegion !== 'All' && item.region !== selectedRegion) {
      return false;
    }

    // Search query filter
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase().trim();
    const matchLabel = item.label.toLowerCase().includes(query);
    const matchCity = item.city?.toLowerCase().includes(query);
    const matchCountry = item.country?.toLowerCase().includes(query);
    const matchTz = item.timezoneCode.toLowerCase().includes(query);
    const matchUtc = item.utcOffset.toLowerCase().includes(query);

    return matchLabel || matchCity || matchCountry || matchTz || matchUtc;
  });

  const handleSelect = (item: LocationItem) => {
    onChange(item.label);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleAutoDetect = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDetecting(true);
    setTimeout(() => {
      const detected = detectBrowserLocation();
      onChange(detected.label);
      setIsDetecting(false);
      setIsOpen(false);
    }, 400);
  };

  const handleCustomSubmit = () => {
    if (searchQuery.trim()) {
      onChange(searchQuery.trim());
      setIsOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-ink-700 mb-1.5">
        Broad City, Region, or Timezone
      </label>

      {/* Main Trigger Box */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`group flex items-center justify-between gap-3 w-full rounded-2xl border bg-paper-100/70 p-3.5 sm:p-4 text-left cursor-pointer transition-all hover:border-paper-400 ${
          isOpen
            ? 'border-accent-500 bg-paper-50 ring-4 ring-accent-500/10'
            : error
            ? 'border-red-400 bg-red-50/30'
            : 'border-paper-300'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-paper-200 text-ink-700 shrink-0 border border-paper-300/80">
            <MapPin className="h-4 w-4 text-accent-600" />
          </div>

          <div className="min-w-0">
            <span className="block font-serif text-base text-ink-950 font-medium truncate">
              {value || 'Select your city, region, or timezone...'}
            </span>
            <span className="block text-[11px] text-ink-500 font-sans">
              Used only for timezone and conversational resonance
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleAutoDetect}
            title="Auto-detect from browser"
            className="flex items-center gap-1 rounded-full bg-paper-200/90 hover:bg-accent-100 hover:text-accent-700 px-2.5 py-1 text-xs font-medium text-ink-700 transition-colors"
          >
            <Navigation className={`h-3 w-3 ${isDetecting ? 'animate-spin text-accent-600' : 'text-accent-500'}`} />
            <span className="hidden sm:inline">Auto-detect</span>
          </button>

          <ChevronDown
            className={`h-4 w-4 text-ink-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-ink-800' : ''
            }`}
          />
        </div>
      </div>

      {/* Dropdown Menu Modal / Sheet */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-3xl border border-paper-300 bg-paper-50 p-4 sm:p-5 shadow-lifted animate-in fade-in zoom-in-95 duration-150 max-w-full">
          {/* Search Input Bar */}
          <div className="relative mb-3">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (filteredLocations.length > 0) {
                    handleSelect(filteredLocations[0]);
                  } else {
                    handleCustomSubmit();
                  }
                }
              }}
              placeholder="Search city, state, or region (e.g. Bengaluru, Mumbai, Delhi, Pune, IST)..."
              className="w-full rounded-xl border border-paper-300 bg-paper-100/80 pl-10 pr-4 py-2.5 text-sm text-ink-950 placeholder:text-ink-400 focus:border-accent-500 focus:bg-paper-50 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
            />
          </div>

          {/* 1-Click Auto Detect Quick Banner */}
          <div
            onClick={handleAutoDetect}
            className="mb-3 flex items-center justify-between gap-2 rounded-xl bg-accent-50/80 p-2.5 px-3 border border-accent-200/80 cursor-pointer hover:bg-accent-100 transition-colors"
          >
            <div className="flex items-center gap-2 text-xs font-medium text-accent-800">
              <Sparkles className="h-3.5 w-3.5 text-accent-600 shrink-0" />
              <span>Use your browser&apos;s local timezone & region</span>
            </div>
            <span className="text-[11px] font-semibold text-accent-600 underline">
              {isDetecting ? 'Detecting...' : 'Detect Now 📍'}
            </span>
          </div>

          {/* Region Tabs */}
          <div className="flex flex-wrap gap-1 mb-3 pb-2 border-b border-paper-200">
            {(
              [
                'All',
                'India & South Asia',
                'Remote / Broad',
                'Asia-Pacific',
                'Europe',
                'Americas',
                'Africa & Middle East',
              ] as RegionFilter[]
            ).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setSelectedRegion(tab)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                  selectedRegion === tab
                    ? 'bg-ink-950 text-paper-50'
                    : 'bg-paper-200/70 text-ink-600 hover:bg-paper-200 hover:text-ink-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Location Items List */}
          <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
            {filteredLocations.length > 0 ? (
              filteredLocations.map(item => {
                const isSelected = value === item.label;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className={`flex items-center justify-between gap-3 rounded-xl p-2.5 px-3 cursor-pointer text-xs transition-colors ${
                      isSelected
                        ? 'bg-accent-100 text-ink-950 font-medium'
                        : 'hover:bg-paper-200 text-ink-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {item.isBroadRegion ? (
                        <Globe className="h-3.5 w-3.5 text-accent-500 shrink-0" />
                      ) : (
                        <MapPin className="h-3.5 w-3.5 text-ink-400 shrink-0" />
                      )}
                      <span className="truncate">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-[10px] text-ink-500 bg-paper-200/80 px-1.5 py-0.5 rounded">
                        {item.utcOffset}
                      </span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-accent-600" />}
                    </div>
                  </div>
                );
              })
            ) : (
              /* Custom fallback */
              <div className="py-4 px-3 text-center">
                <p className="text-xs text-ink-600 mb-2">
                  No exact match for &quot;{searchQuery}&quot;
                </p>
                <button
                  type="button"
                  onClick={handleCustomSubmit}
                  className="rounded-full bg-ink-950 px-4 py-1.5 text-xs font-medium text-paper-50 hover:bg-ink-800 transition-all"
                >
                  Use &quot;{searchQuery}&quot; as custom location
                </button>
              </div>
            )}
          </div>

          {/* Privacy Note */}
          <div className="mt-3 pt-2 border-t border-paper-200 text-center">
            <span className="text-[11px] text-ink-400">
              🔒 Mindmate never tracks precise GPS coordinates or physical addresses.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
