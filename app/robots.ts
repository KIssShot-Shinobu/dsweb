import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/runtime-config";

export default function robots(): MetadataRoute.Robots {
    const appUrl = getAppUrl();
    return {
        rules: [
            {
                userAgent: "*",
                allow: "/",
                disallow: ["/dashboard", "/api"],
            },
        ],
        sitemap: `${appUrl}/sitemap.xml`,
    };
}
