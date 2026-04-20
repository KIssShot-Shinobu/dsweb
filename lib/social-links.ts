function normalizeExternalUrl(value: string | undefined) {
    const input = value?.trim() ?? "";
    if (!input) return "";

    if (/^https?:\/\//i.test(input)) {
        return input;
    }

    return `https://${input.replace(/^\/+/, "")}`;
}

export const SOCIAL_LINKS = {
    discord: normalizeExternalUrl(process.env.NEXT_PUBLIC_SOCIAL_DISCORD),
    youtube: normalizeExternalUrl(process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE),
    instagram: normalizeExternalUrl(process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM),
};

export const SOCIAL_LABELS = {
    discord: "Discord",
    youtube: "YouTube",
    instagram: "Instagram",
};
