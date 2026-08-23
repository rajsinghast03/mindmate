export type LocationItem = {
  id: string;
  label: string;
  city?: string;
  country?: string;
  region: 'India & South Asia' | 'Remote / Broad' | 'Americas' | 'Europe' | 'Asia-Pacific' | 'Africa & Middle East';
  timezoneCode: string;
  utcOffset: string;
  ianaTimezone?: string;
  isBroadRegion?: boolean;
};

export const BROAD_REGIONS: LocationItem[] = [
  {
    id: 'india-ist-all',
    label: 'All India (IST, UTC+5:30)',
    region: 'India & South Asia',
    timezoneCode: 'IST',
    utcOffset: 'UTC+5:30',
    ianaTimezone: 'Asia/Kolkata',
    isBroadRegion: true,
  },
  {
    id: 'remote-global',
    label: 'Remote / Anywhere (Async Thinker)',
    region: 'Remote / Broad',
    timezoneCode: 'ASYNC',
    utcOffset: 'UTC±0',
    isBroadRegion: true,
  },
  {
    id: 'region-south-asia',
    label: 'South Asia (IST / PKT / BDT / NPT)',
    region: 'India & South Asia',
    timezoneCode: 'IST',
    utcOffset: 'UTC+5:30',
    isBroadRegion: true,
  },
  {
    id: 'region-europe',
    label: 'Europe & UK (GMT / CET / EET)',
    region: 'Europe',
    timezoneCode: 'CET',
    utcOffset: 'UTC+1',
    isBroadRegion: true,
  },
  {
    id: 'region-americas',
    label: 'Americas (EST / CST / PST / MST)',
    region: 'Americas',
    timezoneCode: 'EST',
    utcOffset: 'UTC-5',
    isBroadRegion: true,
  },
  {
    id: 'region-east-asia-oceania',
    label: 'East Asia & Oceania (JST / SGT / AEST)',
    region: 'Asia-Pacific',
    timezoneCode: 'SGT',
    utcOffset: 'UTC+8',
    isBroadRegion: true,
  },
];

export const INDIAN_CITIES: LocationItem[] = [
  { id: 'in-bengaluru', label: 'Bengaluru, Karnataka (IST, UTC+5:30)', city: 'Bengaluru', country: 'India', region: 'India & South Asia', timezoneCode: 'IST', utcOffset: 'UTC+5:30', ianaTimezone: 'Asia/Kolkata' },
  { id: 'in-mumbai', label: 'Mumbai, Maharashtra (IST, UTC+5:30)', city: 'Mumbai', country: 'India', region: 'India & South Asia', timezoneCode: 'IST', utcOffset: 'UTC+5:30', ianaTimezone: 'Asia/Kolkata' },
  { id: 'in-delhi-ncr', label: 'New Delhi & NCR (IST, UTC+5:30)', city: 'New Delhi', country: 'India', region: 'India & South Asia', timezoneCode: 'IST', utcOffset: 'UTC+5:30', ianaTimezone: 'Asia/Kolkata' },
  { id: 'in-hyderabad', label: 'Hyderabad, Telangana (IST, UTC+5:30)', city: 'Hyderabad', country: 'India', region: 'India & South Asia', timezoneCode: 'IST', utcOffset: 'UTC+5:30', ianaTimezone: 'Asia/Kolkata' },
  { id: 'in-pune', label: 'Pune, Maharashtra (IST, UTC+5:30)', city: 'Pune', country: 'India', region: 'India & South Asia', timezoneCode: 'IST', utcOffset: 'UTC+5:30', ianaTimezone: 'Asia/Kolkata' },
  { id: 'in-chennai', label: 'Chennai, Tamil Nadu (IST, UTC+5:30)', city: 'Chennai', country: 'India', region: 'India & South Asia', timezoneCode: 'IST', utcOffset: 'UTC+5:30', ianaTimezone: 'Asia/Kolkata' },
  { id: 'in-kolkata', label: 'Kolkata, West Bengal (IST, UTC+5:30)', city: 'Kolkata', country: 'India', region: 'India & South Asia', timezoneCode: 'IST', utcOffset: 'UTC+5:30', ianaTimezone: 'Asia/Kolkata' },
  { id: 'in-kochi', label: 'Kochi & Kerala (IST, UTC+5:30)', city: 'Kochi', country: 'India', region: 'India & South Asia', timezoneCode: 'IST', utcOffset: 'UTC+5:30', ianaTimezone: 'Asia/Kolkata' },
  { id: 'in-jaipur', label: 'Jaipur, Rajasthan (IST, UTC+5:30)', city: 'Jaipur', country: 'India', region: 'India & South Asia', timezoneCode: 'IST', utcOffset: 'UTC+5:30', ianaTimezone: 'Asia/Kolkata' },
  { id: 'in-ahmedabad', label: 'Ahmedabad, Gujarat (IST, UTC+5:30)', city: 'Ahmedabad', country: 'India', region: 'India & South Asia', timezoneCode: 'IST', utcOffset: 'UTC+5:30', ianaTimezone: 'Asia/Kolkata' },
  { id: 'in-goa', label: 'Goa (IST, UTC+5:30)', city: 'Goa', country: 'India', region: 'India & South Asia', timezoneCode: 'IST', utcOffset: 'UTC+5:30', ianaTimezone: 'Asia/Kolkata' },
  { id: 'in-chandigarh', label: 'Chandigarh & Punjab (IST, UTC+5:30)', city: 'Chandigarh', country: 'India', region: 'India & South Asia', timezoneCode: 'IST', utcOffset: 'UTC+5:30', ianaTimezone: 'Asia/Kolkata' },
  { id: 'in-indore', label: 'Indore & Bhopal, MP (IST, UTC+5:30)', city: 'Indore', country: 'India', region: 'India & South Asia', timezoneCode: 'IST', utcOffset: 'UTC+5:30', ianaTimezone: 'Asia/Kolkata' },
  { id: 'in-lucknow', label: 'Lucknow & Varanasi, UP (IST, UTC+5:30)', city: 'Lucknow', country: 'India', region: 'India & South Asia', timezoneCode: 'IST', utcOffset: 'UTC+5:30', ianaTimezone: 'Asia/Kolkata' },
  { id: 'in-dehradun', label: 'Dehradun & Himalayas (IST, UTC+5:30)', city: 'Dehradun', country: 'India', region: 'India & South Asia', timezoneCode: 'IST', utcOffset: 'UTC+5:30', ianaTimezone: 'Asia/Kolkata' },
];

export const INTERNATIONAL_CITIES: LocationItem[] = [
  // Global hubs & diaspora
  { id: 'sg-singapore', label: 'Singapore (SGT, UTC+8)', city: 'Singapore', country: 'Singapore', region: 'Asia-Pacific', timezoneCode: 'SGT', utcOffset: 'UTC+8', ianaTimezone: 'Asia/Singapore' },
  { id: 'ae-dubai', label: 'Dubai, UAE (GST, UTC+4)', city: 'Dubai', country: 'United Arab Emirates', region: 'Africa & Middle East', timezoneCode: 'GST', utcOffset: 'UTC+4', ianaTimezone: 'Asia/Dubai' },
  { id: 'gb-london', label: 'London, United Kingdom (GMT/BST, UTC+0)', city: 'London', country: 'United Kingdom', region: 'Europe', timezoneCode: 'GMT', utcOffset: 'UTC+0', ianaTimezone: 'Europe/London' },
  { id: 'us-sf', label: 'San Francisco & Bay Area, US (PST, UTC-8)', city: 'San Francisco', country: 'United States', region: 'Americas', timezoneCode: 'PST', utcOffset: 'UTC-8', ianaTimezone: 'America/Los_Angeles' },
  { id: 'us-nyc', label: 'New York City, US (EST, UTC-5)', city: 'New York', country: 'United States', region: 'Americas', timezoneCode: 'EST', utcOffset: 'UTC-5', ianaTimezone: 'America/New_York' },
  { id: 'us-sea', label: 'Seattle, US (PST, UTC-8)', city: 'Seattle', country: 'United States', region: 'Americas', timezoneCode: 'PST', utcOffset: 'UTC-8', ianaTimezone: 'America/Los_Angeles' },
  { id: 'us-atx', label: 'Austin, US (CST, UTC-6)', city: 'Austin', country: 'United States', region: 'Americas', timezoneCode: 'CST', utcOffset: 'UTC-6', ianaTimezone: 'America/Chicago' },
  { id: 'ca-tor', label: 'Toronto, Canada (EST, UTC-5)', city: 'Toronto', country: 'Canada', region: 'Americas', timezoneCode: 'EST', utcOffset: 'UTC-5', ianaTimezone: 'America/Toronto' },
  { id: 'de-berlin', label: 'Berlin, Germany (CET, UTC+1)', city: 'Berlin', country: 'Germany', region: 'Europe', timezoneCode: 'CET', utcOffset: 'UTC+1', ianaTimezone: 'Europe/Berlin' },
  { id: 'nl-amsterdam', label: 'Amsterdam, Netherlands (CET, UTC+1)', city: 'Amsterdam', country: 'Netherlands', region: 'Europe', timezoneCode: 'CET', utcOffset: 'UTC+1', ianaTimezone: 'Europe/Amsterdam' },
  { id: 'jp-tokyo', label: 'Tokyo, Japan (JST, UTC+9)', city: 'Tokyo', country: 'Japan', region: 'Asia-Pacific', timezoneCode: 'JST', utcOffset: 'UTC+9', ianaTimezone: 'Asia/Tokyo' },
  { id: 'au-melbourne', label: 'Melbourne & Sydney, Australia (AEST, UTC+10)', city: 'Melbourne', country: 'Australia', region: 'Asia-Pacific', timezoneCode: 'AEST', utcOffset: 'UTC+10', ianaTimezone: 'Australia/Melbourne' },
];

export const ALL_LOCATIONS: LocationItem[] = [
  ...INDIAN_CITIES,
  ...BROAD_REGIONS,
  ...INTERNATIONAL_CITIES,
];

// Helper to auto-detect browser timezone
export function detectBrowserLocation(): LocationItem {
  try {
    const iana = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!iana) return INDIAN_CITIES[0];

    // Check exact IANA match
    const directMatch = ALL_LOCATIONS.find(c => c.ianaTimezone === iana);
    if (directMatch) return directMatch;

    if (iana.includes('Kolkata') || iana.includes('Calcutta')) {
      return INDIAN_CITIES[0];
    }

    // Calculate current UTC offset in minutes
    const date = new Date();
    const offsetMin = -date.getTimezoneOffset();
    const sign = offsetMin >= 0 ? '+' : '-';
    const absMin = Math.abs(offsetMin);
    const hours = Math.floor(absMin / 60);
    const mins = absMin % 60;
    const formattedOffset = `UTC${sign}${hours}${mins > 0 ? `:${mins.toString().padStart(2, '0')}` : ''}`;

    const parts = iana.split('/');
    const cityName = parts[parts.length - 1].replace(/_/g, ' ');

    return {
      id: `detected-${iana}`,
      label: `${cityName} (${formattedOffset})`,
      city: cityName,
      region: 'India & South Asia',
      timezoneCode: formattedOffset,
      utcOffset: formattedOffset,
      ianaTimezone: iana,
    };
  } catch {
    return INDIAN_CITIES[0];
  }
}
