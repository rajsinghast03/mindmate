"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, MapPin, Search } from "lucide-react";
import {
  COUNTRIES,
  DEFAULT_COUNTRY_CODE,
  buildLocationSelection,
  flattenCities,
  getCountryGeo,
  getStateCode,
  normalizeLocationSearch,
  type Country,
  type CountryGeo,
  type LocationSelection,
} from "@/data/world-cities";

interface LocationSelectorProps {
  value: LocationSelection | null;
  onChange: (value: LocationSelection) => void;
  error?: string | null;
}

type Dropdown = "country" | "state" | "city" | null;

const MAX_RENDERED = 150;
const UNKNOWN_BUCKET = "_";

export function LocationSelector({ value, onChange, error }: LocationSelectorProps) {
  const [openDropdown, setOpenDropdown] = useState<Dropdown>(null);
  const [geo, setGeo] = useState<CountryGeo | null>(null);
  const [geoError, setGeoError] = useState(false);
  const [countryQuery, setCountryQuery] = useState("");
  const [stateQuery, setStateQuery] = useState("");
  const [cityInput, setCityInput] = useState(value?.city ?? "");
  /** Admin1 code of the chosen state; null = all states / not chosen. */
  const [bucket, setBucket] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedCountryCode = value?.countryCode ?? DEFAULT_COUNTRY_CODE;
  const selectedCountry = COUNTRIES.find((country) => country.code === selectedCountryCode);

  // Latest value without re-triggering the geo-loading effect
  const valueRef = useRef<LocationSelection | null>(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (value?.city !== undefined && value.city !== cityInput && document.activeElement?.tagName !== "INPUT") {
      setCityInput(value.city ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.city]);

  // Load geography whenever the country changes
  useEffect(() => {
    let cancelled = false;
    setGeo(null);
    setGeoError(false);
    setBucket(null);

    getCountryGeo(selectedCountryCode)
      .then((data) => {
        if (cancelled) return;
        setGeo(data);
        setStateQuery("");
        setCityInput("");

        const current = valueRef.current;
        if (!current || current.countryCode !== selectedCountryCode) return;
        const countryName =
          COUNTRIES.find((c) => c.code === selectedCountryCode)?.name ?? selectedCountryCode;

        if (current.city && !current.state) {
          // Stored selection without a state — locate the city's state + real tz
          const normalized = normalizeLocationSearch(current.city);
          for (const [code, cities] of Object.entries(data.cities)) {
            const match = cities.find(([n]) => normalizeLocationSearch(n) === normalized);
            if (match) {
              const rawName = data.states.find(([sc]) => sc === code)?.[1];
              const isUnknown = code === UNKNOWN_BUCKET || !rawName || rawName === "Other";
              setBucket(isUnknown ? null : code);
              onChange(
                buildLocationSelection(
                  selectedCountryCode,
                  countryName,
                  isUnknown ? null : (rawName ?? null),
                  match[0],
                  match[1],
                ),
              );
              return;
            }
          }
        }

        if (!current.city && !current.state) {
          // Country-only selection — adopt the dominant timezone
          const firstTz = Object.values(data.cities).flat()[0]?.[1];
          if (firstTz) {
            onChange(buildLocationSelection(selectedCountryCode, countryName, null, null, firstTz));
          }
        } else if (current.state) {
          setBucket(getStateCode(data, current.state));
        }
      })
      .catch(() => {
        if (!cancelled) setGeoError(true);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountryCode]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCountries = useMemo(() => {
    const query = normalizeLocationSearch(countryQuery);
    return query
      ? COUNTRIES.filter((country) => normalizeLocationSearch(country.name).includes(query))
      : COUNTRIES;
  }, [countryQuery]);

  const filteredStates = useMemo<[string, string][]>(() => {
    if (!geo) return [];
    const query = normalizeLocationSearch(stateQuery);
    return geo.states.filter(([, name]) => !query || normalizeLocationSearch(name).includes(query));
  }, [geo, stateQuery]);

  /** Cities of the chosen state, or every city in the country when no state chosen. */
  const filteredCities = useMemo<[string, string][]>(() => {
    if (!geo) return [];
    const source = bucket ? geo.cities[bucket] ?? [] : flattenCities(geo);
    const query = normalizeLocationSearch(cityInput);
    return source.filter(([name]) => !query || normalizeLocationSearch(name).includes(query));
  }, [geo, bucket, cityInput]);

  const fallbackTz = (): string => {
    if (geo) {
      for (const [, cities] of Object.entries(geo.cities)) {
        if (cities.length > 0) return cities[0][1];
      }
    }
    return "UTC";
  };

  const selectCountry = (country: Country) => {
    setCountryQuery("");
    setOpenDropdown("state");
    if (country.code !== selectedCountryCode) {
      // Timezone finalised once the new country's geo loads
      onChange(buildLocationSelection(country.code, country.name, null, null, null));
    }
  };

  const selectState = (admin1Code: string, stateName: string) => {
    const isUnknown = admin1Code === UNKNOWN_BUCKET || stateName === "Other";
    const firstCity = geo?.cities[admin1Code]?.[0];
    setBucket(admin1Code);
    setStateQuery("");
    onChange(
      buildLocationSelection(
        selectedCountryCode,
        selectedCountry?.name ?? selectedCountryCode,
        isUnknown ? null : stateName,
        null,
        firstCity?.[1] ?? fallbackTz(),
      ),
    );
    setCityInput("");
    setOpenDropdown("city");
  };

  const clearState = () => {
    setBucket(null);
    setStateQuery("");
    onChange(
      buildLocationSelection(selectedCountryCode, selectedCountry?.name ?? selectedCountryCode, null, null, fallbackTz()),
    );
    setCityInput("");
  };

  const selectCity = (cityName: string, tz: string) => {
    const stateName =
      bucket && geo ? geo.states.find(([c]) => c === bucket)?.[1] ?? null : null;
    const isUnknownState = stateName === "Other";
    onChange(
      buildLocationSelection(
        selectedCountryCode,
        selectedCountry?.name ?? selectedCountryCode,
        isUnknownState ? null : stateName,
        cityName,
        tz,
      ),
    );
    setOpenDropdown(null);
  };

  const chooseRegionOnly = () => {
    onChange(
      buildLocationSelection(selectedCountryCode, selectedCountry?.name ?? selectedCountryCode, null, null, fallbackTz()),
    );
    setCityInput("");
    setOpenDropdown(null);
  };

  const handleCustomCity = () => {
    const custom = cityInput.trim();
    const stateName = bucket && geo ? geo.states.find(([c]) => c === bucket)?.[1] ?? null : null;
    onChange(
      buildLocationSelection(
        selectedCountryCode,
        selectedCountry?.name ?? selectedCountryCode,
        stateName === "Other" ? null : stateName,
        custom || null,
        null,
      ),
    );
    setOpenDropdown(null);
  };

  const triggerClasses = (open: boolean) =>
    `flex w-full cursor-pointer items-center justify-between gap-2 rounded-2xl border bg-paper-100/70 p-3.5 transition-all hover:border-paper-400 ${open ? "border-accent-500 bg-paper-50 ring-4 ring-accent-500/10" : error ? "border-red-400 bg-red-50/30" : "border-paper-300"}`;

  const renderOptions = (
    items: { key: string; label: string; selected: boolean; onSelect: () => void }[],
  ) => (
    <div className="max-h-56 space-y-0.5 overflow-y-auto pr-1">
      {items.slice(0, MAX_RENDERED).map((item) => (
        <button
          type="button"
          key={item.key}
          onMouseDown={(event) => event.preventDefault()}
          onClick={item.onSelect}
          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
            item.selected ? "bg-accent-100 font-medium text-ink-950" : "text-ink-800 hover:bg-paper-200"
          }`}
        >
          <span className="truncate">{item.label}</span>
          {item.selected && <Check className="h-3.5 w-3.5 shrink-0 text-accent-600" />}
        </button>
      ))}
      {items.length > MAX_RENDERED && (
        <p className="px-3 py-2 text-center text-[11px] text-ink-400">
          +{(items.length - MAX_RENDERED).toLocaleString()} more — keep typing to narrow down
        </p>
      )}
      {items.length === 0 && (
        <p className="px-3 py-3 text-center text-xs text-ink-500">No matches found.</p>
      )}
    </div>
  );

  const searchIcon = (
    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
  );

  return (
    <div ref={containerRef}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Country */}
        <div className="relative">
          <div onClick={() => setOpenDropdown(openDropdown === "country" ? null : "country")} className={triggerClasses(openDropdown === "country")}>
            <span className="flex min-w-0 items-center gap-2.5">
              <MapPin className="h-4 w-4 shrink-0 text-accent-600" />
              <span className="truncate font-serif text-sm font-medium text-ink-950 sm:text-base">
                {selectedCountry?.name ?? "Country"}
              </span>
            </span>
            <ChevronDown className={`h-4 w-4 shrink-0 text-ink-400 transition-transform ${openDropdown === "country" ? "rotate-180" : ""}`} />
          </div>
          {openDropdown === "country" && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-2xl border border-paper-300 bg-paper-50 p-3 shadow-lifted animate-in fade-in zoom-in-95 duration-150">
              <div className="relative mb-2">
                {searchIcon}
                <input autoFocus value={countryQuery} onChange={(event) => setCountryQuery(event.target.value)} placeholder="Search countries…" className="w-full rounded-xl border border-paper-300 bg-paper-100/80 py-2 pl-9 pr-3 text-sm text-ink-950 placeholder:text-ink-400 focus:border-accent-500 focus:bg-paper-50 focus:outline-none focus:ring-2 focus:ring-accent-500/20" />
              </div>
              {renderOptions(
                filteredCountries.map((country) => ({
                  key: country.code,
                  label: country.name,
                  selected: country.code === selectedCountryCode,
                  onSelect: () => selectCountry(country),
                })),
              )}
            </div>
          )}
        </div>

        {/* State / Province */}
        <div className="relative">
          <div onClick={() => setOpenDropdown(openDropdown === "state" ? null : "state")} className={triggerClasses(openDropdown === "state")}>
            <span className="flex min-w-0 items-center gap-2.5">
              {!geo ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-ink-400" />
              ) : (
                <MapPin className={`h-4 w-4 shrink-0 ${value?.state ? "text-accent-600" : "text-ink-400"}`} />
              )}
              <span className={`truncate font-serif text-sm font-medium sm:text-base ${value?.state ? "text-ink-950" : "text-ink-400"}`}>
                {geo ? value?.state ?? "State / Province" : "Loading…"}
              </span>
            </span>
            <ChevronDown className={`h-4 w-4 shrink-0 text-ink-400 transition-transform ${openDropdown === "state" ? "rotate-180" : ""}`} />
          </div>
          {openDropdown === "state" && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-2xl border border-paper-300 bg-paper-50 p-3 shadow-lifted animate-in fade-in zoom-in-95 duration-150">
              {!geo ? (
                <p className="py-4 text-center text-xs text-ink-500">{geoError ? "Could not load regions." : "Loading regions…"}</p>
              ) : (
                <>
                  <div className="relative mb-2">
                    {searchIcon}
                    <input autoFocus value={stateQuery} onChange={(event) => setStateQuery(event.target.value)} placeholder="Search states / provinces…" className="w-full rounded-xl border border-paper-300 bg-paper-100/80 py-2 pl-9 pr-3 text-sm text-ink-950 placeholder:text-ink-400 focus:border-accent-500 focus:bg-paper-50 focus:outline-none focus:ring-2 focus:ring-accent-500/20" />
                  </div>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      clearState();
                      setOpenDropdown("city");
                    }}
                    className={`mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm italic transition-colors ${
                      !value?.state ? "bg-accent-100 font-medium text-ink-950" : "text-ink-500 hover:bg-paper-200"
                    }`}
                  >
                    All states — search every city
                    {!value?.state && <Check className="h-3.5 w-3.5 shrink-0 not-italic text-accent-600" />}
                  </button>
                  {renderOptions(
                    filteredStates.map(([code, name]) => ({
                      key: code,
                      label: name === "Other" ? "Other / Unclassified" : name,
                      selected:
                        (code === UNKNOWN_BUCKET && !!bucket && !value?.state) ||
                        value?.state === name,
                      onSelect: () => selectState(code, name),
                    })),
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* City */}
        <div className="relative">
          <label className={triggerClasses(openDropdown === "city")}>
            <MapPin className={`h-4 w-4 shrink-0 ${cityInput ? "text-accent-600" : "text-ink-400"}`} />
            <input
              value={cityInput}
              onFocus={() => setOpenDropdown("city")}
              onChange={(event) => {
                setCityInput(event.target.value);
                setOpenDropdown("city");
              }}
              placeholder="City (optional)"
              className="min-w-0 flex-1 bg-transparent font-serif text-sm font-medium text-ink-950 placeholder:text-ink-400 focus:outline-none sm:text-base"
            />
            <ChevronDown className={`h-4 w-4 shrink-0 text-ink-400 transition-transform ${openDropdown === "city" ? "rotate-180" : ""}`} />
          </label>
          {openDropdown === "city" && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-64 overflow-y-auto rounded-2xl border border-paper-300 bg-paper-50 p-2 shadow-lifted animate-in fade-in zoom-in-95 duration-150">
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={chooseRegionOnly}
                className={`mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm italic transition-colors ${
                  !cityInput.trim() ? "bg-accent-100 font-medium text-ink-950" : "text-ink-500 hover:bg-paper-200"
                }`}
              >
                Prefer not to say — just my region
              </button>
              {filteredCities.slice(0, MAX_RENDERED).map(([name, tz]) => (
                <button
                  type="button"
                  key={`${bucket ?? "all"}-${name}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectCity(name, tz)}
                  className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    cityInput && cityInput.toLowerCase() === name.toLowerCase()
                      ? "bg-accent-100 font-medium text-ink-950"
                      : "text-ink-800 hover:bg-paper-200"
                  }`}
                >
                  {name}
                </button>
              ))}
              {filteredCities.length > MAX_RENDERED && (
                <p className="px-3 py-2 text-center text-[11px] text-ink-400">
                  +{(filteredCities.length - MAX_RENDERED).toLocaleString()} more — keep typing to narrow down
                </p>
              )}
              {cityInput.trim() && (
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={handleCustomCity}
                  className="mt-1 block w-full rounded-lg border-t border-paper-200 px-3 py-2 pt-3 text-left text-xs italic text-ink-500 hover:bg-paper-100"
                >
                  Use “{cityInput.trim()}” as entered
                </button>
              )}
              {!filteredCities.length && !cityInput.trim() && geo && (
                <p className="px-3 py-2 text-xs text-ink-500">Type a city to search, or enter your own.</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-start gap-1.5 text-[11px] text-ink-400">
        <span>Mindmate never tracks GPS or precise addresses. Only broad location is shown.</span>
      </div>
    </div>
  );
}
