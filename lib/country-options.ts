import type { SearchableOption } from "@/components/shared/searchable-combobox";

const FALLBACK_OPTIONS: SearchableOption[] = [
    { value: "ID", label: "Indonesia" },
    { value: "SG", label: "Singapore" },
    { value: "MY", label: "Malaysia" },
    { value: "TH", label: "Thailand" },
    { value: "PH", label: "Philippines" },
    { value: "VN", label: "Vietnam" },
    { value: "JP", label: "Japan" },
    { value: "KR", label: "South Korea" },
    { value: "CN", label: "China" },
    { value: "IN", label: "India" },
    { value: "AU", label: "Australia" },
    { value: "US", label: "United States" },
    { value: "GB", label: "United Kingdom" },
];

function buildCountryOptions(): SearchableOption[] {
    if (typeof Intl === "undefined" || typeof (Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf !== "function") {
        return FALLBACK_OPTIONS;
    }

    try {
        const codes = (Intl as typeof Intl & { supportedValuesOf: (key: string) => string[] }).supportedValuesOf("region");
        const display = new Intl.DisplayNames(["id", "en"], { type: "region" });

        const options = codes
            .filter((code) => code.length === 2)
            .map((code) => ({ value: code, label: display.of(code) || code }))
            .filter((option) => option.label && option.label !== option.value);

        const unique = new Map<string, SearchableOption>();
        for (const option of options) {
            unique.set(option.value, option);
        }

        const sorted = Array.from(unique.values()).sort((a, b) => a.label.localeCompare(b.label, "id"));
        const indonesia = sorted.find((option) => option.value === "ID") ?? { value: "ID", label: "Indonesia" };
        return [indonesia, ...sorted.filter((option) => option.value !== "ID")];
    } catch {
        return FALLBACK_OPTIONS;
    }
}

let cached: SearchableOption[] | null = null;

export function getCountryOptions() {
    if (!cached) {
        cached = buildCountryOptions();
    }
    return cached;
}
