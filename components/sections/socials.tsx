"use client";

import { motion } from "framer-motion";
import { Twitter, Youtube } from "lucide-react";


// Simple Discord Icon Component
const DiscordIcon = ({ className }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="0"
        className={className}
    >
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037 3.999 3.999 0 0 0-.332.358 6.437 6.437 0 0 1-5.042.062 13.562 13.562 0 0 0-.25-.337.074.074 0 0 0-.079-.037 19.736 19.736 0 0 0-4.881 1.515.071.071 0 0 0-.03.029C-1.87 11.231-.02 21.01.033 21.143a.08.08 0 0 0 .041.055 19.919 19.919 0 0 0 5.993 3.018.077.077 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.118.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.018.077.077 0 0 0 .041-.055c.533-8.544-2.825-15.548-7.906-16.772a.071.071 0 0 0-.03-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
);

export function Socials() {
    const socials = [
        {
            name: "Discord",
            icon: DiscordIcon,
            link: "https://discord.gg/duelstandby",
            color: "bg-[#5865F2]",
            description: "Chat, Voice & Tournaments",
        },
        {
            name: "YouTube",
            icon: Youtube,
            link: "https://youtube.com/@duelstandby",
            color: "bg-[#FF0000]",
            description: "Replays & Highlights",
        },
        {
            name: "Twitter",
            icon: Twitter,
            link: "https://twitter.com/duelstandby",
            color: "bg-[#1DA1F2]",
            description: "Updates & News",
        },
    ];

    return (
        <section id="socials" className="py-24 bg-black relative">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 text-white tracking-tight">
                    Join the Conversation
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {socials.map((social, index) => (
                        <motion.a
                            key={social.name}
                            href={social.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={`relative overflow-hidden rounded-2xl p-8 flex flex-col items-center text-center group ${social.color}`}
                        >
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-300" />

                            <div className="relative z-10 text-white">
                                <social.icon className="w-16 h-16 mb-4 mx-auto" strokeWidth={1.5} />
                                <h3 className="text-2xl font-bold mb-2">{social.name}</h3>
                                <p className="text-white/80 font-medium">{social.description}</p>
                            </div>
                        </motion.a>
                    ))}
                </div>
            </div>
        </section>
    );
}
