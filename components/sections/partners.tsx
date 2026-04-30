"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { normalizeAssetUrl } from "@/lib/asset-url";
import { useLocale } from "@/hooks/use-locale";

type PartnerLogoItem = {
    id: string;
    name: string;
    category: "PARTNER" | "SPONSOR";
    logoUrl: string;
    websiteUrl: string | null;
};

interface PartnersProps {
    logos: PartnerLogoItem[];
}

export function Partners({ logos }: PartnersProps) {
    const { t } = useLocale();
    const partners = logos.filter((item) => item.category === "PARTNER");
    const sponsors = logos.filter((item) => item.category === "SPONSOR");

    if (partners.length === 0 && sponsors.length === 0) {
        return null;
    }

    return (
        <section id="partners" className="relative border-b border-base-300 py-20 sm:py-24">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,201,22,0.1),transparent_24%)]" />
            <div className="relative mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    className="mb-10 text-center sm:mb-14"
                >
                    <p className="mb-3 text-xs font-bold uppercase tracking-[0.32em] text-primary sm:text-sm">{t.home.partnersBadge}</p>
                    <h2 className="mb-3 text-2xl font-black text-base-content sm:text-4xl">{t.home.partnersTitle}</h2>
                    <p className="mx-auto max-w-3xl text-sm text-base-content/70 sm:text-base">{t.home.partnersSubtitle}</p>
                </motion.div>

                {partners.length > 0 ? (
                    <div className="mb-8 sm:mb-10">
                        <div className="mb-3 text-center text-xs font-bold uppercase tracking-[0.22em] text-base-content/55">{t.home.partnersGroupPartner}</div>
                        <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
                            {partners.map((item) => (
                                <LogoCard key={item.id} item={item} />
                            ))}
                        </div>
                    </div>
                ) : null}

                {sponsors.length > 0 ? (
                    <div>
                        <div className="mb-3 text-center text-xs font-bold uppercase tracking-[0.22em] text-base-content/55">{t.home.partnersGroupSponsor}</div>
                        <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
                            {sponsors.map((item) => (
                                <LogoCard key={item.id} item={item} />
                            ))}
                        </div>
                    </div>
                ) : null}

                <div className="mt-8 text-center sm:mt-10">
                    <Link href="/contact" className="btn btn-primary rounded-full px-8">
                        {t.home.partnersCta}
                    </Link>
                </div>
            </div>
        </section>
    );
}

function LogoCard({ item }: { item: PartnerLogoItem }) {
    const normalizedLogo = normalizeAssetUrl(item.logoUrl) || item.logoUrl;
    const imageSizeClass = item.category === "SPONSOR" ? "h-full max-h-[68px] sm:max-h-[74px]" : "h-10 sm:h-11";
    const content = (
        <div className="group flex w-[196px] items-center justify-center rounded-box border border-base-300 bg-base-100 p-2 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md sm:w-[220px]">
            <div className="flex aspect-[5/2] w-full items-center justify-center rounded-lg bg-base-100">
                <img
                    src={normalizedLogo}
                    alt={item.name}
                    title={item.name}
                    loading="lazy"
                    className={`${imageSizeClass} w-auto max-w-full object-contain opacity-90 transition-opacity duration-200 group-hover:opacity-100`}
                />
            </div>
        </div>
    );

    if (!item.websiteUrl) return content;

    return (
        <a href={item.websiteUrl} target="_blank" rel="noopener noreferrer" aria-label={item.name} className="inline-flex">
            {content}
        </a>
    );
}
