"use client";

import Link from "next/link";
import { Swords, Youtube, Twitter, Mail } from "lucide-react";

const DiscordIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037 3.999 3.999 0 0 0-.332.358 6.437 6.437 0 0 1-5.042.062 13.562 13.562 0 0 0-.25-.337.074.074 0 0 0-.079-.037 19.736 19.736 0 0 0-4.881 1.515.071.071 0 0 0-.03.029C-1.87 11.231-.02 21.01.033 21.143a.08.08 0 0 0 .041.055 19.919 19.919 0 0 0 5.993 3.018.077.077 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.118.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.018.077.077 0 0 0 .041-.055c.533-8.544-2.825-15.548-7.906-16.772a.071.071 0 0 0-.03-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" /></svg>
);

const footerLinks = {
    community: [{ name: "Discord Server", href: "https://discord.gg/duelstandby" }, { name: "YouTube Channel", href: "https://youtube.com/@duelstandby" }, { name: "Twitter / X", href: "https://twitter.com/duelstandby" }],
    resources: [{ name: "Tier List", href: "#" }, { name: "Deck Builder", href: "#" }, { name: "Card Database", href: "#" }],
    tournaments: [{ name: "Upcoming Events", href: "#tournaments" }, { name: "Past Results", href: "#" }, { name: "Leaderboard", href: "#" }],
    legal: [{ name: "Privacy Policy", href: "#" }, { name: "Terms of Service", href: "#" }, { name: "Contact Us", href: "#" }],
};

export function Footer() {
    return (
        <footer className="border-t border-slate-200 bg-[linear-gradient(180deg,_#fffdf8_0%,_#f8fafc_100%)] dark:border-[#3A3A3A] dark:bg-[#1A1A1A]">
            <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
                <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-5 lg:gap-12">
                    <div className="lg:col-span-2">
                        <div className="mb-4 flex items-center gap-2"><Swords className="h-8 w-8 text-[#FFC916]" /><span className="text-2xl font-bold text-slate-950 dark:text-white">DuelStandby</span></div>
                        <p className="mb-6 max-w-sm leading-relaxed text-slate-600 dark:text-[#E6E6E6]/50">The ultimate online community for Yu-Gi-Oh! Duel Links and Master Duel players. Join us for tournaments, strategy discussions, and more.</p>
                        <div className="flex flex-wrap gap-3 sm:gap-4">
                            <a href="https://discord.gg/duelstandby" target="_blank" rel="noopener noreferrer" className="group rounded-lg bg-slate-100 p-2 transition-colors hover:bg-[#5865F2] active:scale-[0.97] dark:bg-[#3A3A3A]"><DiscordIcon className="h-5 w-5 text-slate-500 transition-colors group-hover:text-white dark:text-[#E6E6E6]/50" /></a>
                            <a href="https://youtube.com/@duelstandby" target="_blank" rel="noopener noreferrer" className="group rounded-lg bg-slate-100 p-2 transition-colors hover:bg-[#FF0000] active:scale-[0.97] dark:bg-[#3A3A3A]"><Youtube className="h-5 w-5 text-slate-500 transition-colors group-hover:text-white dark:text-[#E6E6E6]/50" /></a>
                            <a href="https://twitter.com/duelstandby" target="_blank" rel="noopener noreferrer" className="group rounded-lg bg-slate-100 p-2 transition-colors hover:bg-[#1DA1F2] active:scale-[0.97] dark:bg-[#3A3A3A]"><Twitter className="h-5 w-5 text-slate-500 transition-colors group-hover:text-white dark:text-[#E6E6E6]/50" /></a>
                            <a href="mailto:contact@duelstandby.com" className="group rounded-lg bg-slate-100 p-2 transition-colors hover:bg-slate-500 active:scale-[0.97] dark:bg-[#3A3A3A]"><Mail className="h-5 w-5 text-slate-500 transition-colors group-hover:text-white dark:text-[#E6E6E6]/50" /></a>
                        </div>
                    </div>
                    <div><h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white">Community</h4><ul className="space-y-3">{footerLinks.community.map((link) => <li key={link.name}><Link href={link.href} className="text-sm text-slate-600 transition-colors hover:text-[#FFC916] dark:text-[#E6E6E6]/50">{link.name}</Link></li>)}</ul></div>
                    <div><h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white">Tournaments</h4><ul className="space-y-3">{footerLinks.tournaments.map((link) => <li key={link.name}><Link href={link.href} className="text-sm text-slate-600 transition-colors hover:text-[#FFC916] dark:text-[#E6E6E6]/50">{link.name}</Link></li>)}</ul></div>
                    <div><h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white">Resources</h4><ul className="space-y-3">{footerLinks.resources.map((link) => <li key={link.name}><Link href={link.href} className="text-sm text-slate-600 transition-colors hover:text-[#FFC916] dark:text-[#E6E6E6]/50">{link.name}</Link></li>)}</ul></div>
                </div>
            </div>
            <div className="border-t border-slate-200 dark:border-[#3A3A3A]">
                <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 text-center sm:px-6 md:flex-row md:text-left lg:px-8">
                    <p className="text-sm text-slate-500 dark:text-[#545454]">&copy; {new Date().getFullYear()} DuelStandby. All rights reserved.</p>
                    <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 md:justify-end">{footerLinks.legal.map((link) => <Link key={link.name} href={link.href} className="text-sm text-slate-500 transition-colors hover:text-[#FFC916] dark:text-[#545454]">{link.name}</Link>)}</div>
                </div>
            </div>
        </footer>
    );
}
