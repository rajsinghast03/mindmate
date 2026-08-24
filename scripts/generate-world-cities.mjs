/**
 * One-time generator for data/world-cities.json
 *
 * Source: GeoNames cities15000 dump (CC-BY 4.0) — all cities with population > 15k,
 * including per-city IANA timezone.
 *
 * Usage:
 *   1. mkdir -p /tmp/opencode/geonames && cd there:
 *      curl -O http://download.geonames.org/export/dump/cities15000.zip && unzip cities15000.zip
 *      curl -O http://download.geonames.org/export/dump/countryInfo.txt
 *   2. node scripts/generate-world-cities.mjs /tmp/opencode/geonames
 *
 * Output: data/world-cities.json — compact arrays to minimize bundle size:
 *   { countries: [[iso2, name], ...], cities: { [iso2]: [[name, ianaTz], ...] } }
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const inputDir = process.argv[2] || '/tmp/opencode/geonames';
const outputPath = resolve(__dirname, '../data/world-cities.json');

const MAX_CITIES_DEFAULT = 30;
const MAX_CITIES_INDIA = 100;

const COUNTRY_OVERRIDES = {
  US: 'United States',
};

function parseCountryInfo(path) {
  const raw = readFileSync(path, 'utf8');
  const countries = [];
  for (const line of raw.split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue;
    const cols = line.split('\t');
    // ISO, ISO3, iso-numeric, fips, Name, ...
    const iso = cols[0];
    const name = cols[4];
    if (iso && name) countries.push([iso, name]);
  }
  return countries;
}

function parseCitiesReal(path) {
  const raw = readFileSync(path, 'utf8');
  const byCountry = new Map();
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    const c = line.split('\t');
    const name = c[1];
    const countryCode = c[8];
    const population = parseInt(c[14], 10) || 0;
    const timezone = c[17];
    if (!name || !countryCode || !timezone) continue;
    if (!byCountry.has(countryCode)) byCountry.set(countryCode, []);
    byCountry.get(countryCode).push({ name, population, timezone });
  }
  return byCountry;
}

function dedupeAndSort(cities, limit) {
  const seen = new Set();
  return cities
    .sort((a, b) => b.population - a.population)
    .filter(city => {
      const key = city.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit)
    .map(c => [c.name, c.timezone])
    .sort((a, b) => a[0].localeCompare(b[0]));
}

function main() {
  const countries = parseCountryInfo(resolve(inputDir, 'countryInfo.txt'));
  const cityMap = parseCitiesReal(resolve(inputDir, 'cities15000.txt'));

  const outputCities = {};
  let total = 0;

  for (const [iso] of countries) {
    const cities = cityMap.get(iso) ?? [];
    if (cities.length === 0) continue;
    const limit = iso === 'IN' ? MAX_CITIES_INDIA : MAX_CITIES_DEFAULT;
    const trimmed = dedupeAndSort(cities, limit);
    if (trimmed.length === 0) continue;
    outputCities[iso] = trimmed;
    total += trimmed.length;
  }

  // India pinned first, rest alphabetical
  const sortedCountries = [...countries].sort((a, b) => {
    if (a[0] === 'IN') return -1;
    if (b[0] === 'IN') return 1;
    return a[1].localeCompare(b[1]);
  });

  const payload = {
    generatedAt: new Date().toISOString(),
    source: 'GeoNames cities15000 (CC-BY 4.0)',
    countries: sortedCountries.filter(([iso]) => outputCities[iso]),
    cities: outputCities,
  };

  writeFileSync(outputPath, JSON.stringify(payload));
  console.log(`Wrote ${outputPath}: ${sortedCountries.length} countries, ${total} cities`);
}

main();
