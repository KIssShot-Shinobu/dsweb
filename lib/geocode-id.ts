import geocodeData from "@/data/geocode-id.json";

type GeocodePoint = {
    name: string;
    latitude: number;
    longitude: number;
    province?: string;
};

type GeocodeCountry = {
    name: string;
    latitude: number;
    longitude: number;
};

type GeocodeDataset = {
    country: GeocodeCountry;
    provinces: GeocodePoint[];
    cities: GeocodePoint[];
};

const DATASET = geocodeData as GeocodeDataset;

export type GeocodeResult = {
    latitude: number;
    longitude: number;
    source: "city" | "province" | "country";
};

export function normalizeRegionName(value: string | null | undefined) {
    if (!value) return "";
    return value
        .trim()
        .toLowerCase()
        .replace(/^provinsi\s+/g, "")
        .replace(/^daerah istimewa\s+/g, "")
        .replace(/^daerah khusus ibu\s+kota\s+/g, "")
        .replace(/^daerah khusus ibukota\s+/g, "")
        .replace(/^kabupaten\s+/g, "")
        .replace(/^kab\.?\s+/g, "")
        .replace(/^kota\s+/g, "")
        .replace(/\s+/g, " ");
}

const cityLookup = new Map<string, GeocodePoint>();
const provinceLookup = new Map<string, GeocodePoint>();

function ensureLookupTables() {
    if (cityLookup.size > 0 || provinceLookup.size > 0) return;

    for (const city of DATASET.cities) {
        const key = normalizeRegionName(city.name);
        if (key) {
            cityLookup.set(key, city);
        }
    }

    for (const province of DATASET.provinces) {
        const key = normalizeRegionName(province.name);
        if (key) {
            provinceLookup.set(key, province);
        }
    }
}

export function resolveGeocode({ city, province }: { city?: string | null; province?: string | null }): GeocodeResult {
    ensureLookupTables();

    const cityKey = normalizeRegionName(city);
    if (cityKey && cityLookup.has(cityKey)) {
        const location = cityLookup.get(cityKey)!;
        return {
            latitude: location.latitude,
            longitude: location.longitude,
            source: "city",
        };
    }

    const provinceKey = normalizeRegionName(province);
    if (provinceKey && provinceLookup.has(provinceKey)) {
        const location = provinceLookup.get(provinceKey)!;
        return {
            latitude: location.latitude,
            longitude: location.longitude,
            source: "province",
        };
    }

    return {
        latitude: DATASET.country.latitude,
        longitude: DATASET.country.longitude,
        source: "country",
    };
}

export function getGeocodeDataset() {
    return DATASET;
}
