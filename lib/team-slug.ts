const MAX_SLUG_LENGTH = 191;

export function slugifyTeamName(name: string) {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .replace(/--+/g, "-");
}

export async function generateUniqueTeamSlug(
    name: string,
    exists: (slug: string) => Promise<boolean>
) {
    const base = slugifyTeamName(name) || "team";
    let slug = base.slice(0, MAX_SLUG_LENGTH);
    let counter = 2;

    while (await exists(slug)) {
        const suffix = `-${counter}`;
        const trimmedBase = base.slice(0, Math.max(1, MAX_SLUG_LENGTH - suffix.length));
        slug = `${trimmedBase}${suffix}`;
        counter += 1;
    }

    return slug;
}
