export function normalizeGameIdDigits(value: string) {
    return value.replace(/\D/g, "").slice(0, 9);
}

export function formatGameId(value: string) {
    const digits = normalizeGameIdDigits(value);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 9)}`;
}

export function isFormattedGameId(value: string) {
    return /^\d{3}-\d{3}-\d{3}$/.test(value);
}
