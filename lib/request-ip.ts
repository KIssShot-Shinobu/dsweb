type HeaderBag = {
    get(name: string): string | null;
};

export function extractRequestIp(headers: HeaderBag) {
    const cfIp = headers.get("cf-connecting-ip");
    if (cfIp) return cfIp;

    const forwarded = headers.get("x-forwarded-for");
    if (forwarded) {
        return forwarded.split(",")[0].trim();
    }

    const realIp = headers.get("x-real-ip");
    if (realIp) return realIp;

    return "127.0.0.1";
}
