'use client';

import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  DEFAULT_COUNTRY_CODE,
  COUNTRIES,
  getCitiesForCountry,
  resolveLocationSelection,
  detectBrowserCountry,
  type LocationSelection,
} from '@/data/world-cities';
import { MapPin, Search, Check, ChevronDown, Navigation } from 'lucide-react';

interface LocationSelectorProps {
  value: LocationSelection | null;
  onChange: (value: LocationSelection) => void;
  error?: string | null;
}

type Dropdown = 'country' | 'city' | null;

export function LocationSelector({ value, onChange, error }: LocationSelectorProps) {
  const [openDropdown, setOpenDropdown] = useState<Dropdown>(null);
  const [countryQuery, setCountryQuery] = useState('');
  const [cityQuery, setCityQuery] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedCountryCode = value?.countryCode ?? DEFAULT_COUNTRY_CODE;
  const cities = useMemo(() => getCitiesForCountry(selectedCountryCode), [selectedCountryCode]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectCountry = (code: string) => {
    const selection = resolveLocationSelection(code, null);
    if (selection) onChange(selection);
    setCountryQuery('');
    setOpenDropdown('city');
  };

  const selectCity = (cityName: string | null) => {
    const selection = resolveLocationSelection(selectedCountryCode, cityName);
    if (selection) onChange(selection);
    setCityQuery('');
    setOpenDropdown(null);
  };

  const handleAutoDetect = () => {
    setIsDetecting(true);
    setTimeout(() => {
      const detected = detectBrowserCountry();
      if (detected) {
        const selection = resolveLocationSelection(detected.countryCode, detected.city);
        if (selection) onChange(selection);
      }
      setIsDetecting(false);
      setOpenDropdown(null);
    }, 400);
  };

  const filteredCountries = COUNTRIES.filter(c =>
    !countryQuery.trim() ? true : c.name.toLowerCase().includes(countryQuery.toLowerCase().trim())
  );

  const filteredCities = cities.filter(c =>
    !cityQuery.trim() ? true : c.name.toLowerCase().includes(cityQuery.toLowerCase().trim())
  );

  return (
    <div className="space-y-3" ref={containerRef}>
      <div className="flex items-center justify-between">
        <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-ink-700">
          Broad Location
        </label>
        <button
          type="button"
          onClick={handleAutoDetect}
          className="flex items-center gap-1 rounded-full bg-paper-200/90 hover:bg-accent-100 hover:text-accent-700 px-2.5 py-1 text-xs font-medium text-ink-700 transition-colors"
        >
          <Navigation
            className={`h-3 w-3 ${isDetecting ? 'animate-spin text-accent-600' : 'text-accent-500'}`}
          />
          <span>{isDetecting ? 'Detecting…' : 'Auto-detect'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Country dropdown */}
        <div className="relative">
          <div
            onClick={() => setOpenDropdown(openDropdown === 'country' ? null : 'country')}
            className={`flex items-center justify-between gap-2 w-full rounded-2xl border bg-paper-100/70 p-3.5 cursor-pointer transition-all hover:border-paper-400 ${
              openDropdown === 'country'
                ? 'border-accent-500 bg-paper-50 ring-4 ring-accent-500/10'
                : error
                  ? 'border-red-400 bg-red-50/30'
                  : 'border-paper-300'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <MapPin className="h-4 w-4 text-accent-600 shrink-0" />
              <span className="font-serif text-base text-ink-950 font-medium truncate">
                {value?.country ?? 'Select country'}
              </span>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-ink-400 transition-transform duration-200 shrink-0 ${
                openDropdown === 'country' ? 'rotate-180 text-ink-800' : ''
              }`}
            />
          </div>

          {openDropdown === 'country' && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-2xl border border-paper-300 bg-paper-50 p-3 shadow-lifted animate-in fade-in zoom-in-95 duration-150">
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
                <input
                  type="text"
                  autoFocus
                  value={countryQuery}
                  onChange={e => setCountryQuery(e.target.value)}
                  placeholder="Search countries…"
                  className="w-full rounded-xl border border-paper-300 bg-paper-100/80 pl-9 pr-3 py-2 text-sm text-ink-950 placeholder:text-ink-400 focus:border-accent-500 focus:bg-paper-50 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
                />
              </div>
              <div className="max-h-56 overflow-y-auto space-y-0.5 pr-1">
                {filteredCountries.map(country => (
                  <div
                    key={country.code}
                    onClick={() => selectCountry(country.code)}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors ${
                      country.code === selectedCountryCode
                        ? 'bg-accent-100 text-ink-950 font-medium'
                        : 'hover:bg-paper-200 text-ink-800'
                    }`}
                  >
                    <span className="truncate">{country.name}</span>
                    {country.code === selectedCountryCode && (
                      <Check className="h-3.5 w-3.5 text-accent-600 shrink-0" />
                    )}
                  </div>
                ))}
                {filteredCountries.length === 0 && (
                  <p className="px-3 py-3 text-xs text-ink-500 text-center">No countries found.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* City dropdown */}
        <div className="relative">
          <div
            onClick={() => setOpenDropdown(openDropdown === 'city' ? null : 'city')}
            className={`flex items-center justify-between gap-2 w-full rounded-2xl border bg-paper-100/70 p-3.5 cursor-pointer transition-all hover:border-paper-400 ${
              openDropdown === 'city'
                ? 'border-accent-500 bg-paper-50 ring-4 ring-accent-500/10'
                : error
                  ? 'border-red-400 bg-red-50/30'
                  : 'border-paper-300'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <MapPin
                className={`h-4 w-4 shrink-0 ${value?.city ? 'text-accent-600' : 'text-ink-400'}`}
              />
              <span
                className={`font-serif text-base font-medium truncate ${
                  value?.city ? 'text-ink-950' : 'text-ink-400'
                }`}
              >
                {value?.city ?? 'City (optional)'}
              </span>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-ink-400 transition-transform duration-200 shrink-0 ${
                openDropdown === 'city' ? 'rotate-180 text-ink-800' : ''
              }`}
            />
          </div>

          {openDropdown === 'city' && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-2xl border border-paper-300 bg-paper-50 p-3 shadow-lifted animate-in fade-in zoom-in-95 duration-150">
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
                <input
                  type="text"
                  autoFocus
                  value={cityQuery}
                  onChange={e => setCityQuery(e.target.value)}
                  placeholder="Search cities…"
                  className="w-full rounded-xl border border-paper-300 bg-paper-100/80 pl-9 pr-3 py-2 text-sm text-ink-950 placeholder:text-ink-400 focus:border-accent-500 focus:bg-paper-50 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
                />
              </div>
              <div className="max-h-56 overflow-y-auto space-y-0.5 pr-1">
                {/* Country-only option */}
                <div
                  onClick={() => selectCity(null)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors ${
                    !value?.city
                      ? 'bg-accent-100 text-ink-950 font-medium'
                      : 'text-ink-500 italic hover:bg-paper-200'
                  }`}
                >
                  Prefer not to say — just my country
                  {!value?.city && <Check className="h-3.5 w-3.5 text-accent-600 ml-auto" />}
                </div>
                {filteredCities.map(city => (
                  <div
                    key={city.name}
                    onClick={() => selectCity(city.name)}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors ${
                      city.name === value?.city
                        ? 'bg-accent-100 text-ink-950 font-medium'
                        : 'hover:bg-paper-200 text-ink-800'
                    }`}
                  >
                    <span className="truncate">{city.name}</span>
                    {city.name === value?.city && (
                      <Check className="h-3.5 w-3.5 text-accent-600 shrink-0" />
                    )}
                  </div>
                ))}
                {filteredCities.length === 0 && (
                  <p className="px-3 py-3 text-xs text-ink-500 text-center">
                    No matches — you can keep just your country.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-start gap-1.5 text-[11px] text-ink-400">
        <span>🔒 Mindmate never tracks GPS or precise addresses. Only broad location is shown.</span>
      </div>
    </div>
  );
}
