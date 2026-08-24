import meta from './world-cities-meta.json';

export type Country = {
  code: string;
  name: string;
};

export type City = {
  name: string;
  ianaTimezone: string;
};

/** Per-country geography, lazy-loaded from /geo/<ISO2>.json */
export type CountryGeo = {
  /** [admin1Code, stateName] */
  states: [string, string][];
  /** admin1Code -> [cityName, ianaTimezone] */
  cities: Record<string, [string, string][]>;
};

/**
 * A fully-resolved location as stored on profiles and drafts.
 * Label format: "City, State, Country" | "City, Country" | "Country".
 */
export type LocationSelection = {
  label: string;
  country: string;
  countryCode: string;
  state: string | null;
  city: string | null;
  ianaTimezone: string | null;
};

export const DEFAULT_COUNTRY_CODE = 'IN';
const FALLBACK_TIMEZONE = 'Asia/Kolkata';

const countryTuples = meta.countries as unknown as [string, string][];

export const COUNTRIES: Country[] = countryTuples.map(([code, name]) => ({
  code,
  name,
}));

export function getCountry(code: string): Country | undefined {
  return COUNTRIES.find(c => c.code === code);
}

function getCountryByName(name: string): Country | undefined {
  const lower = name.toLowerCase();
  return COUNTRIES.find(c => c.name.toLowerCase() === lower);
}

// ---------------------------------------------------------------------------
// Lazy geography loading (per-country JSON from /public/geo)
// ---------------------------------------------------------------------------

const geoCache = new Map<string, Promise<CountryGeo>>();

export function getCountryGeo(countryCode: string): Promise<CountryGeo> {
  const code = countryCode.toUpperCase();
  let cached = geoCache.get(code);
  if (!cached) {
    cached = fetch(`/geo/${code}.json`).then(res => {
      if (!res.ok) throw new Error(`No geo data for ${code}`);
      return res.json() as Promise<CountryGeo>;
    });
    cached.catch(() => geoCache.delete(code)); // allow retry on failure
    geoCache.set(code, cached);
  }
  return cached;
}

/** All cities of a country as [name, tz], alphabetically sorted. */
export function flattenCities(geo: CountryGeo): [string, string][] {
  return Object.values(geo.cities)
    .flat()
    .sort((a, b) => a[0].localeCompare(b[0]));
}

export function getStateCode(geo: CountryGeo, stateName: string | null): string | null {
  if (!stateName) return null;
  return geo.states.find(([, n]) => n === stateName)?.[0] ?? null;
}

// ---------------------------------------------------------------------------
// Search normalization (diacritic-insensitive)
// ---------------------------------------------------------------------------

export function normalizeLocationSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase();
}

// ---------------------------------------------------------------------------
// Selection builders
// ---------------------------------------------------------------------------

export function buildLabel(
  countryName: string,
  stateName: string | null,
  cityName: string | null
): string {
  return [cityName, stateName, countryName].filter(Boolean).join(', ');
}

export function buildLocationSelection(
  countryCode: string,
  countryName: string,
  stateName: string | null,
  cityName: string | null,
  ianaTimezone: string | null
): LocationSelection {
  return {
    label: buildLabel(countryName, stateName, cityName),
    country: countryName,
    countryCode,
    state: stateName,
    city: cityName,
    ianaTimezone: ianaTimezone || FALLBACK_TIMEZONE,
  };
}

/**
 * Rebuild a LocationSelection from previously-stored profile fields.
 * Handles legacy labels gracefully; the selector re-resolves the state/tz
 * against live geo data once it loads.
 */
export function locationFromStored(
  label: string | null | undefined,
  ianaTimezone?: string | null
): LocationSelection {
  const defaultCountry =
    getCountry(DEFAULT_COUNTRY_CODE) ?? { code: DEFAULT_COUNTRY_CODE, name: 'India' };
  if (!label) {
    return buildLocationSelection(
      defaultCountry.code,
      defaultCountry.name,
      null,
      null,
      FALLBACK_TIMEZONE
    );
  }

  const parts = label.split(',').map(s => s.trim()).filter(Boolean);
  const maybeCountry =
    parts.length > 1 ? getCountryByName(parts[parts.length - 1]) : undefined;

  if (maybeCountry) {
    const rest = parts.slice(0, -1);
    const cityName = rest.length > 0 ? rest[rest.length - 1] : null;
    const stateName = rest.length > 1 ? rest.slice(0, -1).join(', ') : null;
    return {
      label,
      country: maybeCountry.name,
      countryCode: maybeCountry.code,
      state: stateName,
      city: cityName,
      ianaTimezone: ianaTimezone ?? FALLBACK_TIMEZONE,
    };
  }

  // Unknown country segment — keep the raw label, assume default country
  return {
    label,
    country: defaultCountry.name,
    countryCode: defaultCountry.code,
    state: parts.length > 2 ? parts[1] : null,
    city: parts[0] ?? null,
    ianaTimezone: ianaTimezone ?? FALLBACK_TIMEZONE,
  };
}

// ---------------------------------------------------------------------------
// Timezone utilities (DST-safe)
// ---------------------------------------------------------------------------

/** Current UTC offset (in hours, fractional supported) for an IANA timezone. */
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
