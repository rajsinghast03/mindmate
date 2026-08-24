/**
 * Generator for the location dataset (public/geo/*.json + data/world-cities-meta.json)
 *
 * Source: GeoNames (CC-BY 4.0)
 *   - cities500.zip          every populated place with population >= 500 (~190k rows)
 *   - admin1CodesASCII.txt   human-readable state/province names per admin1 code
 *   - countryInfo.txt        ISO code -> country name
 *
 * City display names use GeoNames `asciiname` (col 3) when present, with an
 * NFD-diacritic-strip fallback, so users see "Ambala", not "Ambāla".
 *
 * Usage:
 *   1. mkdir -p /tmp/opencode/geonames && cd /tmp/opencode/geonames
 *      curl -O http://download.geonames.org/export/dump/cities500.zip && unzip cities500.zip
 *      curl -O http://download.geonames.org/export/dump/admin1CodesASCII.txt
 *      curl -O http://download.geonames.org/export/dump/countryInfo.txt
 *   2. node scripts/generate-world-cities.mjs /tmp/opencode/geonames
 *
 * Output:
 *   public/geo/<ISO2>.json         { states: [[code, name]], cities: { code: [[name, tz]] } }
 *   data/world-cities-meta.json    { countries: [[code, name]] }  (tiny, statically imported)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const inputDir = process.argv[2] || '/tmp/opencode/geonames';
const geoDir = resolve(__dirname, '../public/geo');
const metaPath = resolve(__dirname, '../data/world-cities-meta.json');

/** Strip combining diacritics: "Ambāla" -> "Ambala" */
function toAscii(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9\s.'’()\-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseCountryInfo(path) {
  const countries = [];
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue;
    const c = line.split('\t');
    if (c[0] && c[4]) countries.push([c[0], c[4]]);
  }
  return countries;
}

function parseAdmin1(path) {
  const names = new Map();
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const c = line.split('\t');
    if (c[0] && (c[2] || c[1])) names.set(c[0], c[2] || c[1]);
  }
  return names;
}

/** Prefer the cleanest available display name: asciiname > ascii-stripped name. */
function displayName(nameCol, asciiCol) {
  const ascii = (asciiCol || '').trim();
  if (ascii && /^[\x20-\x7E]+$/.test(ascii)) return ascii;
  return toAscii(nameCol) || nameCol.trim();
}

function parseCities(path) {
  // cc -> admin1Code -> asciiLowerName -> { n, tz, pop }
  const byCountry = new Map();
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const c = line.split('\t');
    const cc = c[8];
    const admin1 = c[10];
    const population = parseInt(c[14], 10) || 0;
    const tz = c[17];
    if (!cc || !tz) continue;

    const rawName = (c[1] || '').trim();
    const name = displayName(rawName, c[2]);
    if (!name) continue;

    if (!byCountry.has(cc)) byCountry.set(cc, new Map());
    const states = byCountry.get(cc);
    const key = admin1 || '_'; // "_" bucket = unknown division
    if (!states.has(key)) states.set(key, new Map());
    const cities = states.get(key);

    const lower = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const existing = cities.get(lower);
    if (!existing || population > existing.pop) {
      cities.set(lower, { n: name, tz, pop: population });
    }
  }
  return byCountry;
}

function main() {
  const countries = parseCountryInfo(join(inputDir, 'countryInfo.txt'));
  const admin1Names = parseAdmin1(join(inputDir, 'admin1CodesASCII.txt'));
  const cityData = parseCities(join(inputDir, 'cities500.txt'));

  mkdirSync(geoDir, { recursive: true });

  let totalCities = 0;
  let totalStates = 0;
  let filesWritten = 0;

  for (const [cc] of countries) {
    const statesMap = cityData.get(cc);
    if (!statesMap) continue;

    const states = [];
    const citiesByState = {};

    for (const [admin1Key, citiesMap] of statesMap) {
      const stateName =
        admin1Key === '_' ? 'Other' : admin1Names.get(`${cc}.${admin1Key}`) ?? 'Other';

      const cityList = [...citiesMap.values()]
        .map(city => [city.n, city.tz])
        .sort((a, b) => a[0].localeCompare(b[0]));

      states.push([admin1Key, stateName]);
      citiesByState[admin1Key] = cityList;
      totalCities += cityList.length;
    }

    states.sort((a, b) => a[1].localeCompare(b[1]));
    totalStates += states.length;

    writeFileSync(join(geoDir, `${cc}.json`), JSON.stringify({ states, cities: citiesByState }));
    filesWritten++;
  }

  const meta = {
    generatedAt: new Date().toISOString(),
    source: 'GeoNames cities500 + admin1CodesASCII (CC-BY 4.0), ASCII display names',
    countries,
  };
  writeFileSync(metaPath, JSON.stringify(meta));

  console.log(
    `Wrote ${filesWritten} country files to public/geo (${totalStates} states, ${totalCities} cities)`
  );
}

main();
