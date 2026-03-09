import { mkdir, readFile, stat, writeFile } from "fs/promises";
import path from "path";
import { getEmsifaApiBaseUrl, getRegionCacheDir, getRegionCacheTtlHours } from "@/lib/runtime-config";

export type RegionProvince = {
    code: string;
    name: string;
};

export type RegionCity = {
    code: string;
    name: string;
    provinceCode: string;
};

type EmsifaRegionRecord = {
    id: string;
    name: string;
};

const CACHE_VERSION = "v1";

function getCachePath(key: string) {
    return path.join(getRegionCacheDir(), CACHE_VERSION, `${key}.json`);
}

async function ensureCacheDir(filePath: string) {
    await mkdir(path.dirname(filePath), { recursive: true });
}

async function readCache<T>(key: string) {
    const filePath = getCachePath(key);

    try {
        const [meta, raw] = await Promise.all([stat(filePath), readFile(filePath, "utf8")]);
        const ageMs = Date.now() - meta.mtimeMs;
        const maxAgeMs = getRegionCacheTtlHours() * 60 * 60 * 1000;

        if (ageMs > maxAgeMs) {
            return null;
        }

        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}

async function writeCache<T>(key: string, data: T) {
    const filePath = getCachePath(key);
    await ensureCacheDir(filePath);
    await writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

async function fetchJson<T>(pathname: string) {
    const response = await fetch(`${getEmsifaApiBaseUrl()}${pathname}`, {
        headers: { Accept: "application/json" },
        next: { revalidate: getRegionCacheTtlHours() * 60 * 60 },
    });

    if (!response.ok) {
        throw new Error(`Gagal mengambil data wilayah (${response.status})`);
    }

    return (await response.json()) as T;
}

function mapProvinces(records: EmsifaRegionRecord[]): RegionProvince[] {
    return records.map((item) => ({ code: item.id, name: item.name }));
}

function mapCities(records: EmsifaRegionRecord[], provinceCode: string): RegionCity[] {
    return records.map((item) => ({ code: item.id, name: item.name, provinceCode }));
}

export async function getIndonesiaProvinces() {
    const cacheKey = "provinces";
    const cached = await readCache<RegionProvince[]>(cacheKey);
    if (cached) return cached;

    const fetched = mapProvinces(await fetchJson<EmsifaRegionRecord[]>("/provinces.json"));
    await writeCache(cacheKey, fetched);
    return fetched;
}

export async function getIndonesiaCitiesByProvince(provinceCode: string) {
    const sanitizedProvinceCode = provinceCode.trim();
    const cacheKey = `regencies-${sanitizedProvinceCode}`;
    const cached = await readCache<RegionCity[]>(cacheKey);
    if (cached) return cached;

    const fetched = mapCities(
        await fetchJson<EmsifaRegionRecord[]>(`/regencies/${encodeURIComponent(sanitizedProvinceCode)}.json`),
        sanitizedProvinceCode,
    );
    await writeCache(cacheKey, fetched);
    return fetched;
}

export async function resolveIndonesiaRegionSelection(provinceCode: string, cityCode: string) {
    const provinces = await getIndonesiaProvinces();
    const province = provinces.find((item) => item.code === provinceCode.trim());
    if (!province) {
        throw new Error("Provinsi tidak valid");
    }

    const cities = await getIndonesiaCitiesByProvince(province.code);
    const city = cities.find((item) => item.code === cityCode.trim());
    if (!city) {
        throw new Error("Kabupaten / kota tidak valid");
    }

    return {
        provinceCode: province.code,
        provinceName: province.name,
        cityCode: city.code,
        cityName: city.name,
    };
}
