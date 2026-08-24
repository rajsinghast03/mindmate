import raw from './world-cities.json';

export type Country = {
  code: string;
  name: string;
};

export type City = {
  name: string;
  ianaTimezone: string;
};

/** A fully-resolved location as stored on profiles and drafts. */
export type LocationSelection = {
  /** Human-readable label, e.g. "Bengaluru, India" or "India". */
  label: string;
  country: string;
  countryCode: string;
  city: string | null;
  ianaTimezone: string;
};

export const DEFAULT_COUNTRY_CODE = 'IN';

const countryTuples = raw.countries as unknown as [string, string][];

export const COUNTRIES: Country[] = countryTuples.map(([code, name]) => ({
  code,
  name,
}));

const cityMap = raw.cities as unknown as Record<string, [string, string][]>;

export const CITIES_BY_COUNTRY: Record<string, City[]> = Object.fromEntries(
  Object.entries(cityMap).map(([code, cities]) => [
    code,
    cities.map(([name, ianaTimezone]) => ({ name, ianaTimezone })),
  ])
);

export function getCountry(code: string): Country | undefined {
  return COUNTRIES.find(c => c.code === code);
}

export function getCitiesForCountry(code: string): City[] {
  return CITIES_BY_COUNTRY[code] ?? [];
}

/** Build a selection object; falls back to the country's top city timezone when no city chosen. */
export function resolveLocationSelection(
  countryCode: string,
  cityName: string | null
): LocationSelection | null {
  const country = getCountry(countryCode);
  if (!country) return null;

  const cities = getCitiesForCountry(countryCode);
  const city = cityName ? cities.find(c => c.name === cityName) ?? null : null;
  const fallbackTz = cities[0]?.ianaTimezone || 'UTC';
  const ianaTimezone = city?.ianaTimezone ?? fallbackTz;

  return {
    label: city ? `${city.name}, ${country.name}` : country.name,
    country: country.name,
    countryCode,
    city: city?.name ?? null,
    ianaTimezone,
  };
}

/** Current UTC offset (in hours, fractional supported) for an IANA timezone — DST-safe. */
export function getUtcOffsetHours(ianaTimezone: string, when: Date = new Date()): number | null {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: ianaTimezone,
      timeZoneName: 'longOffset',
    }).formatToParts(when);
    const tzPart = parts.find(p => p.type === 'timeZoneName')?.value;
    if (!tzPart) return null;
    const match = tzPart.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
    if (!match) return tzPart === 'GMT' ? 0 : null;
    const sign = match[1] === '+' ? 1 : -1;
    const hours = parseInt(match[2], 10);
    const minutes = match[3] ? parseInt(match[3], 10) / 60 : 0;
    return sign * (hours + minutes);
  } catch {
    return null;
  }
}

/**
 * Best-effort guess of the user's location from their browser timezone.
 * Returns null when the browser timezone matches nothing in our dataset.
 */
export function detectBrowserCountry(): { countryCode: string; city: string | null } | null {
  if (typeof window === 'undefined') return null;
  try {
    const iana = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!iana) return null;

    for (const [code, cities] of Object.entries(CITIES_BY_COUNTRY)) {
      const exact = cities.find(c => c.ianaTimezone === iana);
      if (exact) return { countryCode: code, city: exact.name };
    }
    // Partial match on the region segment (e.g. Asia/Kolkata vs dataset variants)
    const region = iana.split('/')[0];
    for (const [code, cities] of Object.entries(CITIES_BY_COUNTRY)) {
      if (cities.some(c => c.ianaTimezone.startsWith(`${region}/`))) {
        return { countryCode: code, city: null };
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Rebuild a LocationSelection from previously-stored profile fields.
 * Handles legacy labels like "Bengaluru, Karnataka (IST, UTC+5:30)" gracefully.
 */
export function locationFromStored(
  label: string | null | undefined,
  ianaTimezone?: string | null
): LocationSelection {
  const defaultSelection = resolveLocationSelection(DEFAULT_COUNTRY_CODE, null)!;
  if (!label) return defaultSelection;

  // Exact dataset match on the clean canonical label
  for (const [code, cities] of Object.entries(CITIES_BY_COUNTRY)) {
    const countryName = getCountry(code)?.name;
    if (!countryName || !label.endsWith(`, ${countryName}`)) continue;
    const cityName = label.slice(0, -(countryName.length + 2));
    if (cities.some(c => c.name === cityName)) {
      return resolveLocationSelection(code, cityName)!;
    }
  }

  const parts = label.split(',').map(s => s.trim());
  const maybeCountry = parts.length > 1 ? parts[parts.length - 1] : null;
  const countryMatch = maybeCountry ? getCountryByName(maybeCountry) : undefined;

  if (countryMatch) {
    const cityName = parts.slice(0, -1).join(', ') || null;
    const knownCity = CITIES_BY_COUNTRY[countryMatch.code]?.find(c => c.name === cityName);
    if (knownCity) return resolveLocationSelection(countryMatch.code, knownCity.name)!;
    return {
      label,
      country: countryMatch.name,
      countryCode: countryMatch.code,
      city: cityName,
      ianaTimezone: ianaTimezone ?? defaultSelection.ianaTimezone,
    };
  }

  return {
    ...defaultSelection,
    label,
    city: parts[0] || null,
    ianaTimezone: ianaTimezone ?? defaultSelection.ianaTimezone,
  };
}

function getCountryByName(name: string): Country | undefined {
  return COUNTRIES.find(c => c.name.toLowerCase() === name.toLowerCase());
}
