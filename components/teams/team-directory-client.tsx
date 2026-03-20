"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { TeamAvatar } from "@/components/teams/team-avatar";
import type { TeamView } from "@/components/teams/types";
import { useToast } from "@/components/dashboard/toast";

export function TeamDirectoryClient({
    teams,
    isLoggedIn,
    activeTeamSlug,
}: {
    teams: TeamView[];
    isLoggedIn: boolean;
    activeTeamSlug: string | null;
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const { success, error: toastError, info } = useToast();
    const [searchQuery, setSearchQuery] = useState("");
    const [pendingTeamIds, setPendingTeamIds] = useState<string[]>([]);

    const hasActiveTeam = Boolean(activeTeamSlug);
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const filteredTeams = useMemo(() => {
        if (!normalizedQuery) return teams;

        return teams.filter((team) => {
            const haystack = `${team.name} ${team.slug} ${team.description ?? ""}`.toLowerCase();
            return haystack.includes(normalizedQuery);
        });
    }, [teams, normalizedQuery]);

    const runAction = async (url: string, init: RequestInit, successMessage: string) => {
        const response = await fetch(url, init);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || data.message || "Aksi gagal diproses");
        }

        success(successMessage);
        startTransition(() => {
            router.refresh();
        });
    };

    const handleJoinRequest = async (teamId: string) => {
        try {
            setPendingTeamIds((prev) => (prev.includes(teamId) ? prev : [...prev, teamId]));
            await runAction(
                "/api/team/request-join",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ teamId }),
                },
                "Permintaan bergabung berhasil dikirim."
            );
            info("Menunggu persetujuan admin team.");
        } catch (actionError) {
            toastError(actionError instanceof Error ? actionError.message : "Gagal mengirim request join");
        }
    };

    return (
        <div className="space-y-5 sm:space-y-6">
            <section className="space-y-3 sm:space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
                    <div className="text-sm font-semibold uppercase tracking-[0.2em] text-base-content/50">Teams</div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
                    <input
                        type="text"
                        className="input input-bordered w-full sm:max-w-md"
                        placeholder="Cari team"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                    />
                </div>
                {filteredTeams.length === 0 ? (
                    <div className="rounded-box border border-dashed border-base-300 bg-base-200/40 p-5 text-sm text-base-content/70">
                        Tidak ada team yang cocok dengan pencarian.
                    </div>
                ) : (
                    <div className="grid gap-4 sm:gap-5 xl:grid-cols-2">
                        {filteredTeams.map((team) => {
                            const isLocallyPending = pendingTeamIds.includes(team.id);
                            const hasPendingJoin = team.viewerHasPendingJoin || isLocallyPending;
                            const hasPendingInvite = team.viewerHasPendingInvite;
                            const canRequestJoin = isLoggedIn && !hasActiveTeam && !team.viewerMembership && !hasPendingJoin && !hasPendingInvite;

                            return (
                                <article key={team.id} className="card border border-base-300 bg-base-100 shadow-sm">
                                    <div className="card-body gap-3 p-4 sm:gap-4 sm:p-5">
                                        <div className="flex items-start gap-3 sm:gap-4">
                                            <TeamAvatar name={team.name} avatarUrl={team.logoUrl} size="lg" />
                                            <div className="space-y-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="text-lg font-semibold sm:text-xl">{team.name}</h3>
                                                    <span className={`badge ${team.isActive ? "badge-success" : "badge-ghost"}`}>
                                                        {team.isActive ? "Aktif" : "Nonaktif"}
                                                    </span>
                                                    {team.viewerMembership ? <span className="badge badge-primary badge-outline">Member</span> : null}
                                                    {hasPendingInvite ? <span className="badge badge-secondary badge-outline">Ada Invite</span> : null}
                                                    {hasPendingJoin ? (
                                                        <span className="badge badge-warning badge-outline">Menunggu</span>
                                                    ) : null}
                                                </div>
                                                <p className="text-xs text-base-content/70 sm:text-sm">
                                                    {team.description || "Belum ada deskripsi team."}
                                                </p>
                                                <div className="flex flex-wrap gap-2 text-xs text-base-content/70">
                                                    <span className="badge badge-outline">{team.memberCount} member</span>
                                                    <span className="badge badge-outline">Captain: {team.captain?.user.username || team.captain?.user.fullName || "-"}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
                                            <div className="rounded-box bg-base-200/70 p-3">
                                                <div className="text-xs text-base-content/60">Vice Captain</div>
                                                <div className="text-lg font-semibold">{team.viceCaptains.length}</div>
                                            </div>
                                            <div className="rounded-box bg-base-200/70 p-3">
                                                <div className="text-xs text-base-content/60">Manager</div>
                                                <div className="text-lg font-semibold">{team.managers.length}</div>
                                            </div>
                                            <div className="rounded-box bg-base-200/70 p-3">
                                                <div className="text-xs text-base-content/60">Coach</div>
                                                <div className="text-lg font-semibold">{team.coaches.length}</div>
                                            </div>
                                            <div className="rounded-box bg-base-200/70 p-3">
                                                <div className="text-xs text-base-content/60">Player</div>
                                                <div className="text-lg font-semibold">{team.players.length}</div>
                                            </div>
                                        </div>

                                        <div className="card-actions flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                            <Link href={`/teams/${team.slug}`} className="btn btn-outline btn-sm">
                                                Lihat Detail
                                            </Link>
                                            <div className="flex gap-2">
                                                {hasPendingInvite ? (
                                                    <span className="badge badge-secondary">Ada Invite</span>
                                                ) : null}
                                                {hasPendingJoin ? (
                                                    <button type="button" className="btn btn-outline btn-sm" disabled>
                                                        Menunggu Persetujuan
                                                    </button>
                                                ) : canRequestJoin ? (
                                                    <button
                                                        type="button"
                                                        className="btn btn-primary btn-sm"
                                                        onClick={() => handleJoinRequest(team.id)}
                                                        disabled={isPending}
                                                    >
                                                        Request Join
                                                    </button>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
}
