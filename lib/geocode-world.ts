import worldData from "@/data/geocode-world.json";

type WorldCountry = {
    code: string;
    name: string;
    latitude: number;
    longitude: number;
    aliases?: string[];
};

type WorldDataset = {
    international: {
        name: string;
        latitude: number;
        longitude: number;
    };
    countries: WorldCountry[];
};

const DATASET = worldData as WorldDataset;

export type CountryGeocodeResult = {
    code: string | null;
    name: string;
    latitude: number;
    longitude: number;
    source: "country" | "international";
};

function normalize(value: string) {
    return value.trim().toLowerCase().replace(/\s+/g, " ");
}

const codeLookup = new Map<string, WorldCountry>();
const nameLookup = new Map<string, WorldCountry>();

function ensureLookups() {
    if (codeLookup.size > 0 || nameLookup.size > 0) return;

    for (const country of DATASET.countries) {
        codeLookup.set(country.code.toUpperCase(), country);
        nameLookup.set(normalize(country.name), country);
        for (const alias of country.aliases || []) {
            nameLookup.set(normalize(alias), country);
        }
    }
}

export function resolveCountryGeocode(input?: { code?: string | null; name?: string | null }): CountryGeocodeResult {
    ensureLookups();
    const code = input?.code?.trim().toUpperCase();
    if (code && codeLookup.has(code)) {
        const country = codeLookup.get(code)!;
        return {
            code: country.code,
            name: country.name,
            latitude: country.latitude,
            longitude: country.longitude,
            source: "country",
        };
    }

    const name = input?.name ? normalize(input.name) : "";
    if (name && nameLookup.has(name)) {
        const country = nameLookup.get(name)!;
        return {
            code: country.code,
            name: country.name,
            latitude: country.latitude,
            longitude: country.longitude,
            source: "country",
        };
    }

    return {
        code: null,
        name: DATASET.international.name,
        latitude: DATASET.international.latitude,
        longitude: DATASET.international.longitude,
        source: "international",
    };
}

export function getWorldDataset() {
    return DATASET;
}
