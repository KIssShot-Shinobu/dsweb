"use client";

import Link from "next/link";
import { Instagram, Mail, Swords, Youtube } from "lucide-react";
import { SOCIAL_LINKS } from "@/lib/social-links";

const DiscordIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037 3.999 3.999 0 0 0-.332.358 6.437 6.437 0 0 1-5.042.062 13.562 13.562 0 0 0-.25-.337.074.074 0 0 0-.079-.037 19.736 19.736 0 0 0-4.881 1.515.071.071 0 0 0-.03.029C-1.87 11.231-.02 21.01.033 21.143a.08.08 0 0 0 .041.055 19.919 19.919 0 0 0 5.993 3.018.077.077 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.118.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.018.077.077 0 0 0 .041-.055c.533-8.544-2.825-15.548-7.906-16.772a.071.071 0 0 0-.03-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" /></svg>
);

const footerLinks = {
    community: [
        { name: "Discord Community", href: SOCIAL_LINKS.discord },
        { name: "YouTube Highlights", href: SOCIAL_LINKS.youtube },
        { name: "Instagram Updates", href: SOCIAL_LINKS.instagram },
    ].filter((link) => Boolean(link.href)),
    resources: [
        { name: "Panduan Komunitas", href: "#" },
        { name: "FAQ Pendaftaran", href: "#" },
        { name: "Transparansi Treasury", href: "/treasury" },
        { name: "Dukungan Anggota", href: "#" },
    ],
    tournaments: [{ name: "Event Mendatang", href: "#tournaments" }, { name: "Direktori Turnamen", href: "/tournaments" }, { name: "Cara Bergabung", href: "/register" }],
    legal: [{ name: "Privasi", href: "#" }, { name: "Ketentuan", href: "#" }, { name: "Hubungi Kami", href: "#" }],
};

export function Footer() {
    return (
        <footer className="border-t border-base-300 bg-base-100/90">
            <div className="mx-auto max-w-[1400px] px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
                <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-5 lg:gap-12">
                    <div className="lg:col-span-2">
                        <div className="mb-4 flex items-center gap-2">
                            <div className="badge badge-primary h-11 w-11 rounded-2xl border-0">
                                <Swords className="h-5 w-5" />
                            </div>
                            <span className="text-2xl font-black text-base-content">Duel Standby</span>
                        </div>
                        <p className="mb-6 max-w-sm leading-relaxed text-base-content/65">
                            Duel Standby adalah komunitas gaming untuk duelists yang mengutamakan kompetisi sehat, informasi yang jelas, dan pengalaman bermain yang lebih profesional.
                        </p>
                        <div className="flex flex-wrap gap-3 sm:gap-4">
                            {SOCIAL_LINKS.discord ? (
                                <a href={SOCIAL_LINKS.discord} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-square rounded-box">
                                    <DiscordIcon className="h-5 w-5" />
                                </a>
                            ) : null}
                            {SOCIAL_LINKS.youtube ? (
                                <a href={SOCIAL_LINKS.youtube} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-square rounded-box">
                                    <Youtube className="h-5 w-5" />
                                </a>
                            ) : null}
                            {SOCIAL_LINKS.instagram ? (
                                <a href={SOCIAL_LINKS.instagram} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-square rounded-box">
                                    <Instagram className="h-5 w-5" />
                                </a>
                            ) : null}
                            <a href="mailto:contact@duelstandby.com" className="btn btn-outline btn-square rounded-box"><Mail className="h-5 w-5" /></a>
                        </div>
                    </div>
                    <div>
                        <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-base-content">Komunitas</h4>
                        <ul className="space-y-3">
                            {footerLinks.community.map((link) => <li key={link.name}><Link href={link.href} className="link-hover link text-sm text-base-content/65">{link.name}</Link></li>)}
                        </ul>
                    </div>
                    <div>
                        <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-base-content">Turnamen</h4>
                        <ul className="space-y-3">
                            {footerLinks.tournaments.map((link) => <li key={link.name}><Link href={link.href} className="link-hover link text-sm text-base-content/65">{link.name}</Link></li>)}
                        </ul>
                    </div>
                    <div>
                        <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-base-content">Informasi</h4>
                        <ul className="space-y-3">
                            {footerLinks.resources.map((link) => <li key={link.name}><Link href={link.href} className="link-hover link text-sm text-base-content/65">{link.name}</Link></li>)}
                        </ul>
                    </div>
                </div>
            </div>
            <div className="border-t border-base-300">
                <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-4 px-4 py-6 text-center sm:px-6 md:flex-row md:text-left lg:px-8">
                    <p className="text-sm text-base-content/55">&copy; {new Date().getFullYear()} Duel Standby. Seluruh hak cipta dilindungi.</p>
                    <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 md:justify-end">
                        {footerLinks.legal.map((link) => <Link key={link.name} href={link.href} className="link-hover link text-sm text-base-content/55">{link.name}</Link>)}
                    </div>
                </div>
            </div>
        </footer>
    );
}
