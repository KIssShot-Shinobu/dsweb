"use client";

import { useEffect, useState } from "react";

interface Member {
    id: string;
    name: string;
    gameId: string;
    rank: string | null;
    role: string;
    joinedAt: string;
}

const getRoleBadge = (role: string) => {
    switch (role.toUpperCase()) {
        case "LEADER":
            return "bg-ds-amber/20 text-ds-amber border-ds-amber/30";
        case "OFFICER":
            return "bg-purple-500/10 text-purple-400 border-purple-400/20";
        default:
            return "bg-blue-500/10 text-blue-400 border-blue-400/20";
    }
};

export function MemberList() {
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/members")
            .then((res) => res.json())
            .then((data) => {
                setMembers(data.slice(0, 5));
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const getInitials = (name: string) =>
        name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

    if (loading) {
        return (
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5">
                <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-white/5">
                    <span className="text-base font-semibold text-gray-900 dark:text-white">Team Members</span>
                </div>
                <div className="p-5 space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/5 animate-pulse" />
                            <div className="flex-1 space-y-2">
                                <div className="h-3 bg-gray-100 dark:bg-white/5 rounded-full w-3/5 animate-pulse" />
                                <div className="h-2.5 bg-gray-100 dark:bg-white/5 rounded-full w-2/5 animate-pulse" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-white/5">
                <span className="text-base font-semibold text-gray-900 dark:text-white">Team Members</span>
                <a href="/dashboard/members" className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-xs font-medium text-gray-600 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/5 transition-all">
                    + Add Member
                </a>
            </div>
            <div className="p-5">
                {members.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="text-3xl mb-2">👥</div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">No members yet</div>
                        <p className="text-xs text-gray-400">Add your first guild member</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {members.map((member) => (
                            <div key={member.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors">
                                <div className="w-9 h-9 rounded-full bg-ds-amber flex items-center justify-center text-black text-xs font-bold flex-shrink-0">
                                    {getInitials(member.name)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{member.name}</div>
                                    <div className="text-xs text-gray-400 dark:text-white/40 truncate">ID: {member.gameId}</div>
                                </div>
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getRoleBadge(member.role)}`}>
                                    {member.role}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
