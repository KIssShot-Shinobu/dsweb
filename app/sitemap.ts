import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/runtime-config";

export default function sitemap(): MetadataRoute.Sitemap {
    const appUrl = getAppUrl();
    const now = new Date();
    const routes = [
        { path: "/", changeFrequency: "daily" as const, priority: 1 },
        { path: "/tournaments", changeFrequency: "daily" as const, priority: 0.9 },
        { path: "/teams", changeFrequency: "weekly" as const, priority: 0.7 },
        { path: "/treasury", changeFrequency: "weekly" as const, priority: 0.6 },
        { path: "/privacy", changeFrequency: "yearly" as const, priority: 0.4 },
        { path: "/terms", changeFrequency: "yearly" as const, priority: 0.4 },
        { path: "/contact", changeFrequency: "yearly" as const, priority: 0.4 },
    ];

    return routes.map((route) => ({
        url: `${appUrl}${route.path}`,
        lastModified: now,
        changeFrequency: route.changeFrequency,
        priority: route.priority,
    }));
}
