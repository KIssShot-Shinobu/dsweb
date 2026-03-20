export const DEFAULT_TIMEZONE = "Asia/Jakarta";
export const FALLBACK_TIMEZONES = ["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura", "UTC"] as const;

export type TimeZoneOption = { value: string; label: string };

export function getTimeZoneOptions(): TimeZoneOption[] {
    let timeZones: string[] = [...FALLBACK_TIMEZONES];
    if (typeof Intl !== "undefined" && "supportedValuesOf" in Intl) {
        try {
            const supported = (Intl as typeof Intl & { supportedValuesOf: (key: string) => string[] }).supportedValuesOf("timeZone");
            if (supported.length > 0) {
                timeZones = supported;
            }
        } catch {
            // fallback to default list
        }
    }

    return timeZones.map((timeZone) => ({ value: timeZone, label: timeZone }));
}
