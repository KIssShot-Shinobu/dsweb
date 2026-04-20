"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type KeyboardEvent, type MouseEvent, useMemo, useState, useTransition } from "react";
import { TeamAvatar } from "@/components/teams/team-avatar";
import type { TeamView } from "@/components/teams/types";
import { useToast } from "@/components/dashboard/toast";
import { useLocale } from "@/hooks/use-locale";
import { normalizeAssetUrl } from "@/lib/asset-url";

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
    const [flippedTeams, setFlippedTeams] = useState<Record<string, boolean>>({});

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

    const toggleTeamFlipped = (teamId: string) => {
        setFlippedTeams((prev) => ({
            ...prev,
            [teamId]: !prev[teamId],
        }));
    };

    const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>, teamId: string) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggleTeamFlipped(teamId);
        }
    };

    const stopCardFlipPropagation = (event: MouseEvent<HTMLElement>) => {
        event.stopPropagation();
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
                    <div className="grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-4">
                        {filteredTeams.map((team) => {
                            const isLocallyPending = pendingTeamIds.includes(team.id);
                            const hasPendingJoin = team.viewerHasPendingJoin || isLocallyPending;
                            const hasPendingInvite = team.viewerHasPendingInvite;
                            const canRequestJoin = isLoggedIn && !hasActiveTeam && !team.viewerMembership && !hasPendingJoin && !hasPendingInvite;
                            const isFlipped = Boolean(flippedTeams[team.id]);
                            const logoUrl = normalizeAssetUrl(team.logoUrl);

                            return (
                                <article
                                    key={team.id}
                                    className="team-card-portrait mx-auto h-full w-full cursor-pointer [perspective:1200px]"
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => toggleTeamFlipped(team.id)}
                                    onKeyDown={(event) => handleCardKeyDown(event, team.id)}
                                    aria-pressed={isFlipped}
                                    aria-label={`${team.name}: ${isFlipped ? t.teams.public.directory.flipToInfo : t.teams.public.directory.flipToLogo}`}
                                >
                                    <div
                                        className="relative h-full w-full transform-gpu transition-transform duration-700 [transform-style:preserve-3d]"
                                        style={{ transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
                                    >
                                        <div className="absolute inset-0 h-full w-full [backface-visibility:hidden]">
                                            <div className="team-card-panel card h-full border border-base-300 bg-base-100 shadow-sm transition-shadow duration-200 hover:shadow-md">
                                                <div className="card-body relative z-[1] gap-3 p-3 sm:p-4">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="rounded-full border border-base-200/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-base-content/90">
                                                            {t.teams.public.directory.teamBadge}
                                                        </span>
                                                        <span className={`badge badge-sm ${team.isActive ? "badge-success" : "badge-ghost"}`}>
                                                            {team.isActive ? t.teams.public.directory.statusActive : t.teams.public.directory.statusInactive}
                                                        </span>
                                                    </div>

                                                    <div className="team-card-media">
                                                        {logoUrl ? (
                                                            <Image
                                                                unoptimized
                                                                src={logoUrl}
                                                                alt={team.name}
                                                                fill
                                                                sizes="(max-width: 640px) 100vw, 360px"
                                                                className="object-cover"
                                                            />
                                                        ) : (
                                                            <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_top,oklch(var(--p)/0.2),transparent_58%)]">
                                                                <TeamAvatar name={team.name} avatarUrl={team.logoUrl} size="xl" />
                                                            </div>
                                                        )}
                                                        <div className="team-card-media-overlay" />
                                                        <div className="team-card-media-meta">
                                                            <span>{t.teams.public.directory.rosterLabel(team.memberCount)}</span>
                                                            <span>{t.teams.public.directory.captainLabel(team.captain?.user.username || team.captain?.user.fullName || "-")}</span>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <div className="space-y-1">
                                                            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-base-content/70">{team.slug}</p>
                                                            <h3 className="line-clamp-1 text-xl font-black uppercase tracking-wide text-base-content">{team.name}</h3>
                                                        </div>
                                                        <p className="line-clamp-3 text-xs leading-relaxed text-base-content/80">
                                                            {team.description || t.teams.public.directory.descriptionEmpty}
                                                        </p>
                                                    </div>

                                                    <div className="h-px w-full bg-base-200/70" />

                                                    <div className="flex flex-wrap gap-2">
                                                        {hasPendingInvite ? (
                                                            <span className="badge badge-secondary badge-outline badge-sm">{t.teams.public.directory.inviteBadge}</span>
                                                        ) : null}
                                                        {hasPendingJoin ? (
                                                            <span className="badge badge-warning badge-outline badge-sm">{t.teams.public.directory.pendingBadge}</span>
                                                        ) : null}
                                                    </div>

                                                    <div className="card-actions mt-auto flex flex-col gap-2">
                                                        <Link
                                                            href={`/teams/${team.slug}`}
                                                            className="btn btn-outline btn-sm w-full border-base-300 text-base-content hover:border-base-content/30"
                                                            onClick={stopCardFlipPropagation}
                                                        >
                                                            {t.teams.public.directory.viewDetail}
                                                        </Link>
                                                        <div className="flex gap-2">
                                                            {hasPendingJoin ? (
                                                                <button type="button" className="btn btn-outline btn-sm flex-1 border-base-300 text-base-content" disabled>
                                                                    {t.teams.public.actions.pendingApproval}
                                                                </button>
                                                            ) : canRequestJoin ? (
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-primary btn-sm flex-1"
                                                                    onClick={(event) => {
                                                                        stopCardFlipPropagation(event);
                                                                        handleJoinRequest(team.id);
                                                                    }}
                                                                    disabled={isPending}
                                                                >
                                                                    {t.teams.public.actions.requestJoin}
                                                                </button>
                                                            ) : (
                                                                <button type="button" className="btn btn-ghost btn-sm flex-1 text-base-content/70" disabled>
                                                                    {t.teams.public.directory.logoPreviewHint}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="absolute inset-0 h-full w-full [transform:rotateY(180deg)] [backface-visibility:hidden]">
                                            <div className="team-card-panel team-card-panel-back card h-full border border-base-300 bg-base-100 shadow-sm">
                                                <div className="card-body relative z-[1] items-center justify-between gap-4 p-4 text-center">
                                                    <div className="flex w-full items-center justify-between gap-2">
                                                        <span className="rounded-full border border-base-200/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-base-content/90">
                                                            {t.teams.public.directory.teamBadge}
                                                        </span>
                                                        <span className={`badge badge-sm ${team.isActive ? "badge-success" : "badge-ghost"}`}>
                                                            {team.isActive ? t.teams.public.directory.statusActive : t.teams.public.directory.statusInactive}
                                                        </span>
                                                    </div>

                                                    <div className="team-card-logo-wrap">
                                                        {logoUrl ? (
                                                            <Image
                                                                unoptimized
                                                                src={logoUrl}
                                                                alt={`${team.name} logo`}
                                                                fill
                                                                sizes="220px"
                                                                className="object-cover"
                                                            />
                                                        ) : (
                                                            <div className="absolute inset-0 flex items-center justify-center">
                                                                <TeamAvatar name={team.name} avatarUrl={team.logoUrl} size="xl" />
                                                            </div>
                                                        )}
                                                        <div className="team-card-logo-tint" />
                                                    </div>

                                                    <div className="space-y-1">
                                                        <h3 className="text-xl font-black uppercase tracking-wide text-base-content">{team.name}</h3>
                                                        <p className="text-xs text-base-content/80">{team.description || t.teams.public.directory.descriptionEmpty}</p>
                                                    </div>

                                                </div>
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
