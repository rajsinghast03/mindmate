export type LocationItem = {
  id: string;
  label: string;
  city?: string;
  country?: string;
  region: 'Americas' | 'Europe' | 'Asia-Pacific' | 'Africa & Middle East' | 'Remote / Broad';
  timezoneCode: string;
  utcOffset: string;
  ianaTimezone?: string;
  isBroadRegion?: boolean;
};

export const BROAD_REGIONS: LocationItem[] = [
  {
    id: 'remote-global',
    label: 'Global / Anywhere (Async Thinker)',
    region: 'Remote / Broad',
    timezoneCode: 'ASYNC',
    utcOffset: 'UTC±0',
    isBroadRegion: true,
  },
  {
    id: 'region-europe',
    label: 'Europe & UK (GMT / CET / EET)',
    region: 'Remote / Broad',
    timezoneCode: 'CET',
    utcOffset: 'UTC+1',
    isBroadRegion: true,
  },
  {
    id: 'region-americas-east',
    label: 'Americas — Eastern & Central (EST / CST)',
    region: 'Remote / Broad',
    timezoneCode: 'EST',
    utcOffset: 'UTC-5',
    isBroadRegion: true,
  },
  {
    id: 'region-americas-west',
    label: 'Americas — Pacific & Mountain (PST / MST)',
    region: 'Remote / Broad',
    timezoneCode: 'PST',
    utcOffset: 'UTC-8',
    isBroadRegion: true,
  },
  {
    id: 'region-south-asia',
    label: 'South Asia (IST / PKT / BDT)',
    region: 'Remote / Broad',
    timezoneCode: 'IST',
    utcOffset: 'UTC+5:30',
    isBroadRegion: true,
  },
  {
    id: 'region-east-asia-oceania',
    label: 'East Asia & Oceania (JST / SGT / AEST)',
    region: 'Remote / Broad',
    timezoneCode: 'JST',
    utcOffset: 'UTC+9',
    isBroadRegion: true,
  },
  {
    id: 'region-latam',
    label: 'Latin America (BRT / ART / COT)',
    region: 'Remote / Broad',
    timezoneCode: 'BRT',
    utcOffset: 'UTC-3',
    isBroadRegion: true,
  },
  {
    id: 'region-africa',
    label: 'Africa & Middle East (WAT / CAT / EAT / GST)',
    region: 'Remote / Broad',
    timezoneCode: 'EAT',
    utcOffset: 'UTC+3',
    isBroadRegion: true,
  },
];

export const WORLD_CITIES: LocationItem[] = [
  // India & South Asia
  { id: 'in-mumbai', label: 'Mumbai, India (IST, UTC+5:30)', city: 'Mumbai', country: 'India', region: 'Asia-Pacific', timezoneCode: 'IST', utcOffset: 'UTC+5:30', ianaTimezone: 'Asia/Kolkata' },
  { id: 'in-delhi', label: 'New Delhi, India (IST, UTC+5:30)', city: 'New Delhi', country: 'India', region: 'Asia-Pacific', timezoneCode: 'IST', utcOffset: 'UTC+5:30', ianaTimezone: 'Asia/Kolkata' },
  { id: 'in-bengaluru', label: 'Bengaluru, India (IST, UTC+5:30)', city: 'Bengaluru', country: 'India', region: 'Asia-Pacific', timezoneCode: 'IST', utcOffset: 'UTC+5:30', ianaTimezone: 'Asia/Kolkata' },
  { id: 'in-hyderabad', label: 'Hyderabad, India (IST, UTC+5:30)', city: 'Hyderabad', country: 'India', region: 'Asia-Pacific', timezoneCode: 'IST', utcOffset: 'UTC+5:30', ianaTimezone: 'Asia/Kolkata' },
  { id: 'in-pune', label: 'Pune, India (IST, UTC+5:30)', city: 'Pune', country: 'India', region: 'Asia-Pacific', timezoneCode: 'IST', utcOffset: 'UTC+5:30', ianaTimezone: 'Asia/Kolkata' },
  { id: 'in-chennai', label: 'Chennai, India (IST, UTC+5:30)', city: 'Chennai', country: 'India', region: 'Asia-Pacific', timezoneCode: 'IST', utcOffset: 'UTC+5:30', ianaTimezone: 'Asia/Kolkata' },
  { id: 'in-kolkata', label: 'Kolkata, India (IST, UTC+5:30)', city: 'Kolkata', country: 'India', region: 'Asia-Pacific', timezoneCode: 'IST', utcOffset: 'UTC+5:30', ianaTimezone: 'Asia/Kolkata' },
  { id: 'pk-karachi', label: 'Karachi, Pakistan (PKT, UTC+5)', city: 'Karachi', country: 'Pakistan', region: 'Asia-Pacific', timezoneCode: 'PKT', utcOffset: 'UTC+5', ianaTimezone: 'Asia/Karachi' },
  { id: 'bd-dhaka', label: 'Dhaka, Bangladesh (BDT, UTC+6)', city: 'Dhaka', country: 'Bangladesh', region: 'Asia-Pacific', timezoneCode: 'BDT', utcOffset: 'UTC+6', ianaTimezone: 'Asia/Dhaka' },
  { id: 'lk-colombo', label: 'Colombo, Sri Lanka (IST, UTC+5:30)', city: 'Colombo', country: 'Sri Lanka', region: 'Asia-Pacific', timezoneCode: 'IST', utcOffset: 'UTC+5:30', ianaTimezone: 'Asia/Colombo' },

  // United Kingdom & Europe
  { id: 'gb-london', label: 'London, United Kingdom (GMT/BST, UTC+0)', city: 'London', country: 'United Kingdom', region: 'Europe', timezoneCode: 'GMT', utcOffset: 'UTC+0', ianaTimezone: 'Europe/London' },
  { id: 'gb-edinburgh', label: 'Edinburgh, United Kingdom (GMT/BST, UTC+0)', city: 'Edinburgh', country: 'United Kingdom', region: 'Europe', timezoneCode: 'GMT', utcOffset: 'UTC+0', ianaTimezone: 'Europe/London' },
  { id: 'gb-oxford', label: 'Oxford & Cambridge, UK (GMT, UTC+0)', city: 'Oxford', country: 'United Kingdom', region: 'Europe', timezoneCode: 'GMT', utcOffset: 'UTC+0', ianaTimezone: 'Europe/London' },
  { id: 'de-berlin', label: 'Berlin, Germany (CET, UTC+1)', city: 'Berlin', country: 'Germany', region: 'Europe', timezoneCode: 'CET', utcOffset: 'UTC+1', ianaTimezone: 'Europe/Berlin' },
  { id: 'de-munich', label: 'Munich, Germany (CET, UTC+1)', city: 'Munich', country: 'Germany', region: 'Europe', timezoneCode: 'CET', utcOffset: 'UTC+1', ianaTimezone: 'Europe/Berlin' },
  { id: 'fr-paris', label: 'Paris, France (CET, UTC+1)', city: 'Paris', country: 'France', region: 'Europe', timezoneCode: 'CET', utcOffset: 'UTC+1', ianaTimezone: 'Europe/Paris' },
  { id: 'nl-amsterdam', label: 'Amsterdam, Netherlands (CET, UTC+1)', city: 'Amsterdam', country: 'Netherlands', region: 'Europe', timezoneCode: 'CET', utcOffset: 'UTC+1', ianaTimezone: 'Europe/Amsterdam' },
  { id: 'ch-zurich', label: 'Zurich, Switzerland (CET, UTC+1)', city: 'Zurich', country: 'Switzerland', region: 'Europe', timezoneCode: 'CET', utcOffset: 'UTC+1', ianaTimezone: 'Europe/Zurich' },
  { id: 'es-madrid', label: 'Madrid & Barcelona, Spain (CET, UTC+1)', city: 'Madrid', country: 'Spain', region: 'Europe', timezoneCode: 'CET', utcOffset: 'UTC+1', ianaTimezone: 'Europe/Madrid' },
  { id: 'it-rome', label: 'Rome & Milan, Italy (CET, UTC+1)', city: 'Rome', country: 'Italy', region: 'Europe', timezoneCode: 'CET', utcOffset: 'UTC+1', ianaTimezone: 'Europe/Rome' },
  { id: 'se-stockholm', label: 'Stockholm, Sweden (CET, UTC+1)', city: 'Stockholm', country: 'Sweden', region: 'Europe', timezoneCode: 'CET', utcOffset: 'UTC+1', ianaTimezone: 'Europe/Stockholm' },
  { id: 'no-oslo', label: 'Oslo, Norway (CET, UTC+1)', city: 'Oslo', country: 'Norway', region: 'Europe', timezoneCode: 'CET', utcOffset: 'UTC+1', ianaTimezone: 'Europe/Oslo' },
  { id: 'dk-copenhagen', label: 'Copenhagen, Denmark (CET, UTC+1)', city: 'Copenhagen', country: 'Denmark', region: 'Europe', timezoneCode: 'CET', utcOffset: 'UTC+1', ianaTimezone: 'Europe/Copenhagen' },
  { id: 'ie-dublin', label: 'Dublin, Ireland (GMT/IST, UTC+0)', city: 'Dublin', country: 'Ireland', region: 'Europe', timezoneCode: 'GMT', utcOffset: 'UTC+0', ianaTimezone: 'Europe/Dublin' },
  { id: 'at-vienna', label: 'Vienna, Austria (CET, UTC+1)', city: 'Vienna', country: 'Austria', region: 'Europe', timezoneCode: 'CET', utcOffset: 'UTC+1', ianaTimezone: 'Europe/Vienna' },
  { id: 'pt-lisbon', label: 'Lisbon, Portugal (WET, UTC+0)', city: 'Lisbon', country: 'Portugal', region: 'Europe', timezoneCode: 'WET', utcOffset: 'UTC+0', ianaTimezone: 'Europe/Lisbon' },
  { id: 'cz-prague', label: 'Prague, Czechia (CET, UTC+1)', city: 'Prague', country: 'Czechia', region: 'Europe', timezoneCode: 'CET', utcOffset: 'UTC+1', ianaTimezone: 'Europe/Prague' },
  { id: 'pl-warsaw', label: 'Warsaw, Poland (CET, UTC+1)', city: 'Warsaw', country: 'Poland', region: 'Europe', timezoneCode: 'CET', utcOffset: 'UTC+1', ianaTimezone: 'Europe/Warsaw' },

  // United States & Canada
  { id: 'us-sf', label: 'San Francisco & Bay Area, US (PST, UTC-8)', city: 'San Francisco', country: 'United States', region: 'Americas', timezoneCode: 'PST', utcOffset: 'UTC-8', ianaTimezone: 'America/Los_Angeles' },
  { id: 'us-sea', label: 'Seattle, US (PST, UTC-8)', city: 'Seattle', country: 'United States', region: 'Americas', timezoneCode: 'PST', utcOffset: 'UTC-8', ianaTimezone: 'America/Los_Angeles' },
  { id: 'us-la', label: 'Los Angeles, US (PST, UTC-8)', city: 'Los Angeles', country: 'United States', region: 'Americas', timezoneCode: 'PST', utcOffset: 'UTC-8', ianaTimezone: 'America/Los_Angeles' },
  { id: 'us-nyc', label: 'New York City, US (EST, UTC-5)', city: 'New York', country: 'United States', region: 'Americas', timezoneCode: 'EST', utcOffset: 'UTC-5', ianaTimezone: 'America/New_York' },
  { id: 'us-bos', label: 'Boston, US (EST, UTC-5)', city: 'Boston', country: 'United States', region: 'Americas', timezoneCode: 'EST', utcOffset: 'UTC-5', ianaTimezone: 'America/New_York' },
  { id: 'us-chi', label: 'Chicago, US (CST, UTC-6)', city: 'Chicago', country: 'United States', region: 'Americas', timezoneCode: 'CST', utcOffset: 'UTC-6', ianaTimezone: 'America/Chicago' },
  { id: 'us-atx', label: 'Austin, US (CST, UTC-6)', city: 'Austin', country: 'United States', region: 'Americas', timezoneCode: 'CST', utcOffset: 'UTC-6', ianaTimezone: 'America/Chicago' },
  { id: 'us-den', label: 'Denver, US (MST, UTC-7)', city: 'Denver', country: 'United States', region: 'Americas', timezoneCode: 'MST', utcOffset: 'UTC-7', ianaTimezone: 'America/Denver' },
  { id: 'us-pdx', label: 'Portland, US (PST, UTC-8)', city: 'Portland', country: 'United States', region: 'Americas', timezoneCode: 'PST', utcOffset: 'UTC-8', ianaTimezone: 'America/Los_Angeles' },
  { id: 'ca-tor', label: 'Toronto, Canada (EST, UTC-5)', city: 'Toronto', country: 'Canada', region: 'Americas', timezoneCode: 'EST', utcOffset: 'UTC-5', ianaTimezone: 'America/Toronto' },
  { id: 'ca-van', label: 'Vancouver, Canada (PST, UTC-8)', city: 'Vancouver', country: 'Canada', region: 'Americas', timezoneCode: 'PST', utcOffset: 'UTC-8', ianaTimezone: 'America/Vancouver' },
  { id: 'ca-mtl', label: 'Montreal, Canada (EST, UTC-5)', city: 'Montreal', country: 'Canada', region: 'Americas', timezoneCode: 'EST', utcOffset: 'UTC-5', ianaTimezone: 'America/Toronto' },

  // East & Southeast Asia, Oceania
  { id: 'jp-tokyo', label: 'Tokyo, Japan (JST, UTC+9)', city: 'Tokyo', country: 'Japan', region: 'Asia-Pacific', timezoneCode: 'JST', utcOffset: 'UTC+9', ianaTimezone: 'Asia/Tokyo' },
  { id: 'jp-kyoto', label: 'Kyoto & Osaka, Japan (JST, UTC+9)', city: 'Kyoto', country: 'Japan', region: 'Asia-Pacific', timezoneCode: 'JST', utcOffset: 'UTC+9', ianaTimezone: 'Asia/Tokyo' },
  { id: 'sg-singapore', label: 'Singapore (SGT, UTC+8)', city: 'Singapore', country: 'Singapore', region: 'Asia-Pacific', timezoneCode: 'SGT', utcOffset: 'UTC+8', ianaTimezone: 'Asia/Singapore' },
  { id: 'kr-seoul', label: 'Seoul, South Korea (KST, UTC+9)', city: 'Seoul', country: 'South Korea', region: 'Asia-Pacific', timezoneCode: 'KST', utcOffset: 'UTC+9', ianaTimezone: 'Asia/Seoul' },
  { id: 'tw-taipei', label: 'Taipei, Taiwan (CST, UTC+8)', city: 'Taipei', country: 'Taiwan', region: 'Asia-Pacific', timezoneCode: 'CST', utcOffset: 'UTC+8', ianaTimezone: 'Asia/Taipei' },
  { id: 'hk-hongkong', label: 'Hong Kong (HKT, UTC+8)', city: 'Hong Kong', country: 'Hong Kong', region: 'Asia-Pacific', timezoneCode: 'HKT', utcOffset: 'UTC+8', ianaTimezone: 'Asia/Hong_Kong' },
  { id: 'au-melbourne', label: 'Melbourne, Australia (AEST, UTC+10)', city: 'Melbourne', country: 'Australia', region: 'Asia-Pacific', timezoneCode: 'AEST', utcOffset: 'UTC+10', ianaTimezone: 'Australia/Melbourne' },
  { id: 'au-sydney', label: 'Sydney, Australia (AEST, UTC+10)', city: 'Sydney', country: 'Australia', region: 'Asia-Pacific', timezoneCode: 'AEST', utcOffset: 'UTC+10', ianaTimezone: 'Australia/Sydney' },
  { id: 'nz-auckland', label: 'Auckland & Wellington, NZ (NZST, UTC+12)', city: 'Auckland', country: 'New Zealand', region: 'Asia-Pacific', timezoneCode: 'NZST', utcOffset: 'UTC+12', ianaTimezone: 'Pacific/Auckland' },
  { id: 'id-jakarta', label: 'Jakarta & Bali, Indonesia (WIB/WITA, UTC+7/+8)', city: 'Jakarta', country: 'Indonesia', region: 'Asia-Pacific', timezoneCode: 'WIB', utcOffset: 'UTC+7', ianaTimezone: 'Asia/Jakarta' },
  { id: 'th-bangkok', label: 'Bangkok, Thailand (ICT, UTC+7)', city: 'Bangkok', country: 'Thailand', region: 'Asia-Pacific', timezoneCode: 'ICT', utcOffset: 'UTC+7', ianaTimezone: 'Asia/Bangkok' },
  { id: 'vn-saigon', label: 'Ho Chi Minh & Hanoi, Vietnam (ICT, UTC+7)', city: 'Ho Chi Minh City', country: 'Vietnam', region: 'Asia-Pacific', timezoneCode: 'ICT', utcOffset: 'UTC+7', ianaTimezone: 'Asia/Ho_Chi_Minh' },

  // Latin America
  { id: 'br-sp', label: 'São Paulo, Brazil (BRT, UTC-3)', city: 'São Paulo', country: 'Brazil', region: 'Americas', timezoneCode: 'BRT', utcOffset: 'UTC-3', ianaTimezone: 'America/Sao_Paulo' },
  { id: 'mx-mexico', label: 'Mexico City, Mexico (CST, UTC-6)', city: 'Mexico City', country: 'Mexico', region: 'Americas', timezoneCode: 'CST', utcOffset: 'UTC-6', ianaTimezone: 'America/Mexico_City' },
  { id: 'ar-ba', label: 'Buenos Aires, Argentina (ART, UTC-3)', city: 'Buenos Aires', country: 'Argentina', region: 'Americas', timezoneCode: 'ART', utcOffset: 'UTC-3', ianaTimezone: 'America/Argentina/Buenos_Aires' },
  { id: 'cl-santiago', label: 'Santiago, Chile (CLT, UTC-4)', city: 'Santiago', country: 'Chile', region: 'Americas', timezoneCode: 'CLT', utcOffset: 'UTC-4', ianaTimezone: 'America/Santiago' },
  { id: 'co-bogota', label: 'Bogotá & Medellín, Colombia (COT, UTC-5)', city: 'Bogota', country: 'Colombia', region: 'Americas', timezoneCode: 'COT', utcOffset: 'UTC-5', ianaTimezone: 'America/Bogota' },

  // Africa & Middle East
  { id: 'ae-dubai', label: 'Dubai, UAE (GST, UTC+4)', city: 'Dubai', country: 'United Arab Emirates', region: 'Africa & Middle East', timezoneCode: 'GST', utcOffset: 'UTC+4', ianaTimezone: 'Asia/Dubai' },
  { id: 'za-capetown', label: 'Cape Town & Johannesburg, SA (SAST, UTC+2)', city: 'Cape Town', country: 'South Africa', region: 'Africa & Middle East', timezoneCode: 'SAST', utcOffset: 'UTC+2', ianaTimezone: 'Africa/Johannesburg' },
  { id: 'ke-nairobi', label: 'Nairobi, Kenya (EAT, UTC+3)', city: 'Nairobi', country: 'Kenya', region: 'Africa & Middle East', timezoneCode: 'EAT', utcOffset: 'UTC+3', ianaTimezone: 'Africa/Nairobi' },
  { id: 'ng-lagos', label: 'Lagos, Nigeria (WAT, UTC+1)', city: 'Lagos', country: 'Nigeria', region: 'Africa & Middle East', timezoneCode: 'WAT', utcOffset: 'UTC+1', ianaTimezone: 'Africa/Lagos' },
  { id: 'eg-cairo', label: 'Cairo, Egypt (EET, UTC+2)', city: 'Cairo', country: 'Egypt', region: 'Africa & Middle East', timezoneCode: 'EET', utcOffset: 'UTC+2', ianaTimezone: 'Africa/Cairo' },
  { id: 'il-telaviv', label: 'Tel Aviv, Israel (IST, UTC+2)', city: 'Tel Aviv', country: 'Israel', region: 'Africa & Middle East', timezoneCode: 'IST', utcOffset: 'UTC+2', ianaTimezone: 'Asia/Jerusalem' },
];

export const ALL_LOCATIONS: LocationItem[] = [...BROAD_REGIONS, ...WORLD_CITIES];

// Helper to auto-detect browser timezone
export function detectBrowserLocation(): LocationItem {
  try {
    const iana = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!iana) return BROAD_REGIONS[0];

    // Check exact IANA match in world cities
    const directMatch = WORLD_CITIES.find(c => c.ianaTimezone === iana);
    if (directMatch) return directMatch;

    // Calculate current UTC offset in minutes
    const date = new Date();
    const offsetMin = -date.getTimezoneOffset();
    const sign = offsetMin >= 0 ? '+' : '-';
    const absMin = Math.abs(offsetMin);
    const hours = Math.floor(absMin / 60);
    const mins = absMin % 60;
    const formattedOffset = `UTC${sign}${hours}${mins > 0 ? `:${mins.toString().padStart(2, '0')}` : ''}`;

    // Clean IANA city name (e.g. 'Asia/Kolkata' -> 'Kolkata')
    const parts = iana.split('/');
    const cityName = parts[parts.length - 1].replace(/_/g, ' ');

    return {
      id: `detected-${iana}`,
      label: `${cityName} (${formattedOffset})`,
      city: cityName,
      region: 'Remote / Broad',
      timezoneCode: formattedOffset,
      utcOffset: formattedOffset,
      ianaTimezone: iana,
    };
  } catch {
    return BROAD_REGIONS[0];
  }
}
