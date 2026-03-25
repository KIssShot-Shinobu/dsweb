"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { TeamAvatar } from "@/components/teams/team-avatar";
import type { TeamView } from "@/components/teams/types";
import { useToast } from "@/components/dashboard/toast";
import { useLocale } from "@/hooks/use-locale";

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
    const { t } = useLocale();
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
            throw new Error(data.error || data.message || t.teams.public.actions.actionFailed);
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
                t.teams.public.actions.joinSuccess
            );
            info(t.teams.public.actions.joinPendingInfo);
        } catch (actionError) {
            toastError(actionError instanceof Error ? actionError.message : t.teams.public.actions.joinFailed);
        }
    };

    return (
        <div className="space-y-5 sm:space-y-6">
            <section className="space-y-3 sm:space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
                    <div className="text-sm font-semibold uppercase tracking-[0.2em] text-base-content/50">{t.teams.public.directory.label}</div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
                    <input
                        type="text"
                        className="input input-bordered w-full sm:max-w-md"
                        placeholder={t.teams.public.directory.searchPlaceholder}
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                    />
                </div>
                {filteredTeams.length === 0 ? (
                    <div className="rounded-box border border-dashed border-base-300 bg-base-200/40 p-5 text-sm text-base-content/70">
                        {t.teams.public.directory.empty}
                    </div>
                ) : (
                    <div className="grid gap-4 sm:gap-5 xl:grid-cols-2">
                        {filteredTeams.map((team) => {
                            const isLocallyPending = pendingTeamIds.includes(team.id);
                            const hasPendingJoin = team.viewerHasPendingJoin || isLocallyPending;
                            const hasPendingInvite = team.viewerHasPendingInvite;
                            const canRequestJoin = isLoggedIn && !hasActiveTeam && !team.viewerMembership && !hasPendingJoin && !hasPendingInvite;

                            return (
                                <article
                                    key={team.id}
                                    className="card border border-base-300 bg-base-100 shadow-sm transition-shadow duration-200 hover:shadow-md"
                                >
                                    <div className="card-body gap-4 p-4 sm:gap-5 sm:p-5">
                                        <div className="flex items-start gap-3 sm:gap-4">
                                            <TeamAvatar name={team.name} avatarUrl={team.logoUrl} size="lg" />
                                            <div className="space-y-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="rounded-full border border-base-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-base-content/55">
                                                        {t.teams.public.directory.teamBadge}
                                                    </span>
                                                    <h3 className="text-lg font-semibold sm:text-xl">{team.name}</h3>
                                                    <span className={`badge ${team.isActive ? "badge-success" : "badge-ghost"}`}>
                                                        {team.isActive ? t.teams.public.directory.statusActive : t.teams.public.directory.statusInactive}
                                                    </span>
                                                    {hasPendingInvite ? (
                                                        <span className="badge badge-secondary badge-outline">{t.teams.public.directory.inviteBadge}</span>
                                                    ) : null}
                                                    {hasPendingJoin ? (
                                                        <span className="badge badge-warning badge-outline">{t.teams.public.directory.pendingBadge}</span>
                                                    ) : null}
                                                </div>
                                                <p className="text-xs leading-relaxed text-base-content/70 sm:text-sm">
                                                    {team.description || t.teams.public.directory.descriptionEmpty}
                                                </p>
                                                <div className="flex flex-wrap items-center gap-2 text-[11px] text-base-content/50">
                                                    <span className="rounded-full border border-base-200 px-2.5 py-1">
                                                        {t.teams.public.directory.rosterLabel(team.memberCount)}
                                                    </span>
                                                    <span className="text-base-content/40">·</span>
                                                    <span>{t.teams.public.directory.captainLabel(team.captain?.user.username || team.captain?.user.fullName || "-")}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="h-px w-full bg-base-200/80" />

                                        <div className="card-actions flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                            <Link href={`/teams/${team.slug}`} className="btn btn-outline btn-sm">
                                                {t.teams.public.directory.viewDetail}
                                            </Link>
                                            <div className="flex gap-2">
                                                {hasPendingJoin ? (
                                                    <button type="button" className="btn btn-outline btn-sm" disabled>
                                                        {t.teams.public.actions.pendingApproval}
                                                    </button>
                                                ) : canRequestJoin ? (
                                                    <button
                                                        type="button"
                                                        className="btn btn-primary btn-sm"
                                                        onClick={() => handleJoinRequest(team.id)}
                                                        disabled={isPending}
                                                    >
                                                        {t.teams.public.actions.requestJoin}
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
