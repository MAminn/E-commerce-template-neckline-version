const BOSTA_API_BASE = "https://app.bosta.co/api/v2";
const DEFAULT_EGYPT_COUNTRY_ID = "60e4482c7cb7d4bc4849c4d5";

function getBostaApiKey(): string | null {
  return process.env.SYN_BOSTA_KEY ?? null;
}

export interface BostaDistrictEntry {
  cityId: string;
  cityCode: string;
  cityName: string;
  zoneId: string;
  zoneName: string;
  districtId: string;
  districtName: string;
}

/** Full drop-off shape for Bosta create-delivery API. */
export interface BostaResolvedDropOffAddress {
  city: string;
  zoneId: string;
  districtId: string;
  firstLine: string;
  secondLine: string;
  buildingNumber: string;
  floor: string;
  apartment: string;
}

export interface BostaCheckoutDistrict {
  districtId: string;
  districtName: string;
}

export interface BostaCheckoutZone {
  zoneId: string;
  zoneName: string;
  districts: BostaCheckoutDistrict[];
}

export interface BostaCheckoutCity {
  cityId: string;
  cityName: string;
  zones: BostaCheckoutZone[];
}

let cachedDistricts: BostaDistrictEntry[] | null = null;
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function pickString(obj: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === "string" && val.trim()) return val.trim();
  }
  return undefined;
}

function parseZoneHint(zone?: string | null): string {
  if (!zone?.trim()) return "";
  const trimmed = zone.trim();
  if (trimmed.includes(" - ")) {
    const [part1, part2] = trimmed.split(" - ").map((part) => part.trim());
    return part1 || part2 || trimmed;
  }
  return trimmed;
}

function flattenDistrictsPayload(payload: unknown): BostaDistrictEntry[] {
  const entries: BostaDistrictEntry[] = [];
  const root = asRecord(payload);
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(root?.data)
      ? root!.data
      : Array.isArray(root?.result)
        ? root!.result
        : [];

  for (const cityItem of list) {
    const cityRec = asRecord(cityItem);
    if (!cityRec) continue;

    const cityName = pickString(cityRec, "cityName", "name", "cityNameEn", "nameEn") ?? "Unknown";
    const cityCode = pickString(cityRec, "cityCode", "code") ?? "";
    const cityId = pickString(cityRec, "cityId", "_id", "id") ?? "";

    const districts = Array.isArray(cityRec.districts)
      ? cityRec.districts
      : Array.isArray(cityRec.zones)
        ? cityRec.zones
        : [];

    for (const districtItem of districts) {
      const dRec = asRecord(districtItem);
      if (!dRec) continue;

      const districtId = pickString(dRec, "districtId");
      const districtName = pickString(dRec, "districtName", "name", "nameEn");
      const zoneName = pickString(dRec, "zoneName", "zone") ?? districtName;
      const zoneId = pickString(dRec, "zoneId") ?? "";

      if (!districtId || !districtName || !cityCode || !zoneId) continue;

      entries.push({
        cityId,
        cityCode,
        cityName,
        zoneId,
        zoneName: zoneName ?? districtName,
        districtId,
        districtName,
      });
    }
  }

  return entries;
}

async function loadDistricts(): Promise<BostaDistrictEntry[]> {
  const now = Date.now();
  if (cachedDistricts && now - cacheLoadedAt < CACHE_TTL_MS) {
    return cachedDistricts;
  }

  const apiKey = getBostaApiKey();
  if (!apiKey) return [];

  const countryId = process.env.BOSTA_EGYPT_COUNTRY_ID ?? DEFAULT_EGYPT_COUNTRY_ID;
  const res = await fetch(
    `${BOSTA_API_BASE}/cities/getAllDistricts?countryId=${encodeURIComponent(countryId)}`,
    {
      headers: { Authorization: apiKey },
    },
  );

  const payload = await res.json();
  if (!res.ok) {
    const msg =
      (asRecord(payload)?.message as string | undefined) ??
      `Bosta districts API error ${res.status}`;
    throw new Error(msg);
  }

  cachedDistricts = flattenDistrictsPayload(payload);
  cacheLoadedAt = now;
  return cachedDistricts;
}

function findDistrictMatch(
  districts: BostaDistrictEntry[],
  city: string,
  zoneHint: string,
): BostaDistrictEntry | undefined {
  const cityNorm = normalize(city);
  const zoneNorm = zoneHint ? normalize(zoneHint) : "";

  const inCity = districts.filter(
    (d) =>
      normalize(d.cityName) === cityNorm ||
      normalize(d.cityName).includes(cityNorm) ||
      cityNorm.includes(normalize(d.cityName)) ||
      normalize(d.cityCode) === cityNorm,
  );

  if (zoneNorm && inCity.length > 0) {
    const zoneMatch = inCity.find(
      (d) =>
        normalize(d.zoneName) === zoneNorm ||
        normalize(d.zoneName).includes(zoneNorm) ||
        zoneNorm.includes(normalize(d.zoneName)) ||
        normalize(d.districtName) === zoneNorm ||
        normalize(d.districtName).includes(zoneNorm) ||
        zoneNorm.includes(normalize(d.districtName)),
    );
    if (zoneMatch) return zoneMatch;
  }

  if (inCity.length > 0) return inCity[0];

  if (zoneNorm) {
    return districts.find(
      (d) =>
        normalize(d.zoneName) === zoneNorm ||
        normalize(d.zoneName).includes(zoneNorm) ||
        normalize(d.districtName) === zoneNorm ||
        normalize(d.districtName).includes(zoneNorm),
    );
  }

  return undefined;
}

/** Group flat district rows into city → zone → district tree for checkout UI. */
export async function getBostaCheckoutLocations(): Promise<BostaCheckoutCity[]> {
  const entries = await loadDistricts();
  const cityMap = new Map<string, BostaCheckoutCity>();

  for (const entry of entries) {
    let city = cityMap.get(entry.cityId);
    if (!city) {
      city = { cityId: entry.cityId, cityName: entry.cityName, zones: [] };
      cityMap.set(entry.cityId, city);
    }

    let zone = city.zones.find((z) => z.zoneId === entry.zoneId);
    if (!zone) {
      zone = {
        zoneId: entry.zoneId,
        zoneName: entry.zoneName,
        districts: [],
      };
      city.zones.push(zone);
    }

    if (!zone.districts.some((d) => d.districtId === entry.districtId)) {
      zone.districts.push({
        districtId: entry.districtId,
        districtName: entry.districtName,
      });
    }
  }

  return [...cityMap.values()]
    .map((city) => ({
      ...city,
      zones: city.zones
        .map((zone) => ({
          ...zone,
          districts: [...zone.districts].sort((a, b) =>
            a.districtName.localeCompare(b.districtName),
          ),
        }))
        .sort((a, b) => a.zoneName.localeCompare(b.zoneName)),
    }))
    .sort((a, b) => a.cityName.localeCompare(b.cityName));
}

function findDistrictById(
  districts: BostaDistrictEntry[],
  districtId: string,
): BostaDistrictEntry | undefined {
  return districts.find((d) => d.districtId === districtId);
}

/**
 * Build a Bosta-compatible dropOffAddress (city name + zone + districtId + firstLine).
 */
export async function resolveBostaDropOffAddress(input: {
  city: string;
  zone?: string | null;
  firstLine: string;
  districtId?: string | null;
  buildingNumber?: string | null;
  apartment?: string | null;
  floor?: string | null;
}): Promise<BostaResolvedDropOffAddress> {
  const firstLine = input.firstLine.trim();
  const zoneHint = parseZoneHint(input.zone);

  let match: BostaDistrictEntry | undefined;

  try {
    const districts = await loadDistricts();

    if (input.districtId?.trim()) {
      match = findDistrictById(districts, input.districtId.trim());
    }

    if (!match) {
      match = findDistrictMatch(districts, input.city.trim(), zoneHint);
    }
  } catch (err) {
    console.warn("[Bosta] Could not load districts list:", err);
  }

  if (!match?.districtId || !match.zoneId) {
    throw new Error(
      `[Bosta] Could not resolve district for city "${input.city}"${zoneHint ? ` / zone "${zoneHint}"` : ""}. Enter a valid city and area.`,
    );
  }

  return {
    city: match.cityName,
    zoneId: match.zoneId,
    districtId: match.districtId,
    firstLine,
    secondLine: firstLine,
    buildingNumber: input.buildingNumber?.trim() || "1",
    floor: input.floor?.trim() || "1",
    apartment: input.apartment?.trim() || "1",
  };
}
