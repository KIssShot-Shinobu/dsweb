"use client";

import Link from "next/link";
import { Swords, Youtube, Twitter, Mail } from "lucide-react";

const DiscordIcon = ({ className }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
    >
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037 3.999 3.999 0 0 0-.332.358 6.437 6.437 0 0 1-5.042.062 13.562 13.562 0 0 0-.25-.337.074.074 0 0 0-.079-.037 19.736 19.736 0 0 0-4.881 1.515.071.071 0 0 0-.03.029C-1.87 11.231-.02 21.01.033 21.143a.08.08 0 0 0 .041.055 19.919 19.919 0 0 0 5.993 3.018.077.077 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.118.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.018.077.077 0 0 0 .041-.055c.533-8.544-2.825-15.548-7.906-16.772a.071.071 0 0 0-.03-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
);

const footerLinks = {
    community: [
        { name: "Discord Server", href: "https://discord.gg/duelstandby" },
        { name: "YouTube Channel", href: "https://youtube.com/@duelstandby" },
        { name: "Twitter / X", href: "https://twitter.com/duelstandby" },
    ],
    resources: [
        { name: "Tier List", href: "#" },
        { name: "Deck Builder", href: "#" },
        { name: "Card Database", href: "#" },
    ],
    tournaments: [
        { name: "Upcoming Events", href: "#tournaments" },
        { name: "Past Results", href: "#" },
        { name: "Leaderboard", href: "#" },
    ],
    legal: [
        { name: "Privacy Policy", href: "#" },
        { name: "Terms of Service", href: "#" },
        { name: "Contact Us", href: "#" },
    ],
};

export function Footer() {
    return (
        <footer className="bg-[#1A1A1A] border-t border-[#3A3A3A]">
            {/* Main Footer Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
                    {/* Brand Column */}
                    <div className="lg:col-span-2">
                        <div className="flex items-center gap-2 mb-4">
                            <Swords className="w-8 h-8 text-[#FFC916]" />
                            <span className="text-2xl font-bold text-white">DuelStandby</span>
                        </div>
                        <p className="text-[#E6E6E6]/50 mb-6 max-w-sm leading-relaxed">
                            The ultimate online community for Yu-Gi-Oh! Duel Links and Master Duel players. Join us for tournaments, strategy discussions, and more.
                        </p>
                        {/* Social Icons */}
                        <div className="flex gap-4">
                            <a
                                href="https://discord.gg/duelstandby"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 bg-[#3A3A3A] hover:bg-[#5865F2] rounded-lg transition-colors group"
                            >
                                <DiscordIcon className="w-5 h-5 text-[#E6E6E6]/50 group-hover:text-white transition-colors" />
                            </a>
                            <a
                                href="https://youtube.com/@duelstandby"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 bg-[#3A3A3A] hover:bg-[#FF0000] rounded-lg transition-colors group"
                            >
                                <Youtube className="w-5 h-5 text-[#E6E6E6]/50 group-hover:text-white transition-colors" />
                            </a>
                            <a
                                href="https://twitter.com/duelstandby"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 bg-[#3A3A3A] hover:bg-[#1DA1F2] rounded-lg transition-colors group"
                            >
                                <Twitter className="w-5 h-5 text-[#E6E6E6]/50 group-hover:text-white transition-colors" />
                            </a>
                            <a
                                href="mailto:contact@duelstandby.com"
                                className="p-2 bg-[#3A3A3A] hover:bg-[#545454] rounded-lg transition-colors group"
                            >
                                <Mail className="w-5 h-5 text-[#E6E6E6]/50 group-hover:text-white transition-colors" />
                            </a>
                        </div>
                    </div>

                    {/* Links Columns */}
                    <div>
                        <h4 className="text-white font-semibold mb-4 uppercase text-sm tracking-wider">Community</h4>
                        <ul className="space-y-3">
                            {footerLinks.community.map((link) => (
                                <li key={link.name}>
                                    <Link href={link.href} className="text-[#E6E6E6]/50 hover:text-[#FFC916] transition-colors text-sm">
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-semibold mb-4 uppercase text-sm tracking-wider">Tournaments</h4>
                        <ul className="space-y-3">
                            {footerLinks.tournaments.map((link) => (
                                <li key={link.name}>
                                    <Link href={link.href} className="text-[#E6E6E6]/50 hover:text-[#FFC916] transition-colors text-sm">
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-semibold mb-4 uppercase text-sm tracking-wider">Resources</h4>
                        <ul className="space-y-3">
                            {footerLinks.resources.map((link) => (
                                <li key={link.name}>
                                    <Link href={link.href} className="text-[#E6E6E6]/50 hover:text-[#FFC916] transition-colors text-sm">
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="border-t border-[#3A3A3A]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-[#545454] text-sm">
                        &copy; {new Date().getFullYear()} DuelStandby. All rights reserved.
                    </p>
                    <div className="flex gap-6">
                        {footerLinks.legal.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                className="text-[#545454] hover:text-[#FFC916] transition-colors text-sm"
                            >
                                {link.name}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
}
