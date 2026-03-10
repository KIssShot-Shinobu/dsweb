"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState, useTransition, type ChangeEvent } from "react";
import { Modal } from "@/components/dashboard/modal";
import { TeamAvatar } from "@/components/teams/team-avatar";
import type { TeamView } from "@/components/teams/types";

type PendingInvite = {
    id: string;
    createdAt: string;
    team: {
        id: string;
        name: string;
        slug: string;
        logoUrl: string | null;
    };
    invitedBy: {
        fullName: string;
    };
};

export function TeamDirectoryClient({
    teams,
    pendingInvites,
    isLoggedIn,
    activeTeamSlug,
}: {
    teams: TeamView[];
    pendingInvites: PendingInvite[];
    isLoggedIn: boolean;
    activeTeamSlug: string | null;
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [createOpen, setCreateOpen] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [form, setForm] = useState({
        name: "",
        slug: "",
        description: "",
        logoUrl: "",
    });

    const hasActiveTeam = Boolean(activeTeamSlug);
    const isBusy = isPending || uploadingLogo;
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const filteredTeams = useMemo(() => {
        if (!normalizedQuery) return teams;

        return teams.filter((team) => {
            const haystack = `${team.name} ${team.slug} ${team.description ?? ""}`.toLowerCase();
            return haystack.includes(normalizedQuery);
        });
    }, [teams, normalizedQuery]);

    const runAction = async (url: string, init: RequestInit, successMessage: string) => {
        setMessage(null);
        setError(null);

        const response = await fetch(url, init);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || data.message || "Aksi gagal diproses");
        }

        setMessage(successMessage);
        startTransition(() => {
            router.refresh();
        });
    };

    const handleCreateTeam = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        try {
            await runAction(
                "/api/team/create",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(form),
                },
                "Team berhasil dibuat. Anda sekarang menjadi captain."
            );

            setForm({ name: "", slug: "", description: "", logoUrl: "" });
            setCreateOpen(false);
        } catch (actionError) {
            setError(actionError instanceof Error ? actionError.message : "Gagal membuat team");
        }
    };

    const handleJoinRequest = async (teamId: string) => {
        try {
            await runAction(
                "/api/team/request-join",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ teamId }),
                },
                "Permintaan bergabung berhasil dikirim."
            );
        } catch (actionError) {
            setError(actionError instanceof Error ? actionError.message : "Gagal mengirim request join");
        }
    };

    const handleLogoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setError(null);
        setUploadingLogo(true);

        const payload = new FormData();
        payload.append("file", file);

        try {
            const response = await fetch("/api/upload", { method: "POST", body: payload });
            const data = await response.json();

            if (!response.ok || !data?.success || !data?.url) {
                throw new Error(data?.message || "Gagal upload logo team.");
            }

            setForm((current) => ({ ...current, logoUrl: data.url }));
        } catch (actionError) {
            setError(actionError instanceof Error ? actionError.message : "Gagal upload logo team.");
        } finally {
            setUploadingLogo(false);
            event.target.value = "";
        }
    };

    return (
        <div className="space-y-6">
            {message ? <div className="alert alert-success shadow-sm">{message}</div> : null}
            {error ? <div className="alert alert-error shadow-sm">{error}</div> : null}

            {isLoggedIn ? null : null}

            {isLoggedIn && !hasActiveTeam ? null : null}

            <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm font-semibold uppercase tracking-[0.2em] text-base-content/50">Teams</div>
                    {hasActiveTeam ? (
                        <Link href={`/teams/${activeTeamSlug}/manage`} className="btn btn-secondary btn-sm">
                            Kelola Team Saya
                        </Link>
                    ) : null}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <input
                        type="text"
                        className="input input-bordered w-full sm:max-w-md"
                        placeholder="Cari team"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                    />
                    {isLoggedIn && !hasActiveTeam ? (
                        <button type="button" className="btn btn-primary" onClick={() => setCreateOpen(true)}>
                            Buat Team
                        </button>
                    ) : null}
                </div>
                {filteredTeams.length === 0 ? (
                    <div className="rounded-box border border-dashed border-base-300 bg-base-200/40 p-5 text-sm text-base-content/70">
                        Tidak ada team yang cocok dengan pencarian.
                    </div>
                ) : (
                    <div className="grid gap-4 xl:grid-cols-2">
                        {filteredTeams.map((team) => {
                            const hasPendingInvite = pendingInvites.some((invite) => invite.team.id === team.id);
                            const canRequestJoin = isLoggedIn && !hasActiveTeam && !team.viewerMembership && !hasPendingInvite;

                            return (
                                <article key={team.id} className="card border border-base-300 bg-base-100 shadow-sm">
                                    <div className="card-body gap-4">
                                        <div className="flex items-start gap-4">
                                            <TeamAvatar name={team.name} avatarUrl={team.logoUrl} size="lg" />
                                            <div className="space-y-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="text-xl font-semibold">{team.name}</h3>
                                                    <span className={`badge ${team.isActive ? "badge-success" : "badge-ghost"}`}>
                                                        {team.isActive ? "Aktif" : "Nonaktif"}
                                                    </span>
                                                    {team.viewerMembership ? <span className="badge badge-primary badge-outline">Member</span> : null}
                                                </div>
                                                <p className="text-sm text-base-content/70">
                                                    {team.description || "Belum ada deskripsi team."}
                                                </p>
                                                <div className="flex flex-wrap gap-2 text-xs text-base-content/70">
                                                    <span className="badge badge-outline">{team.memberCount} member</span>
                                                    <span className="badge badge-outline">Captain: {team.captain?.user.fullName || "-"}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
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

                                        <div className="card-actions justify-between">
                                            <Link href={`/teams/${team.slug}`} className="btn btn-outline btn-sm">
                                                Lihat Detail
                                            </Link>
                                            <div className="flex gap-2">
                                                {team.viewerMembership ? (
                                                    <Link href={`/teams/${team.slug}/manage`} className="btn btn-secondary btn-sm">
                                                        Manage
                                                    </Link>
                                                ) : null}
                                                {canRequestJoin ? (
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

            <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Buat Team Baru" size="md">
                <form className="space-y-4" onSubmit={handleCreateTeam}>
                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="form-control w-full">
                            <div className="label">
                                <span className="label-text">Nama Team</span>
                            </div>
                            <input
                                className="input input-bordered w-full"
                                value={form.name}
                                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                                placeholder="Duel Standby Alpha"
                                required
                                disabled={isBusy}
                            />
                        </label>
                        <label className="form-control w-full">
                            <div className="label">
                                <span className="label-text">Slug</span>
                            </div>
                            <input
                                className="input input-bordered w-full"
                                value={form.slug}
                                onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value.toLowerCase() }))}
                                placeholder="duel-standby-alpha"
                                required
                                disabled={isBusy}
                            />
                        </label>
                    </div>
                    <label className="form-control w-full">
                        <div className="label">
                            <span className="label-text">Deskripsi</span>
                        </div>
                        <textarea
                            className="textarea textarea-bordered min-h-28"
                            value={form.description}
                            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                            placeholder="Ceritakan visi, gaya bermain, dan target team."
                            disabled={isBusy}
                        />
                    </label>
                    <label className="form-control w-full">
                        <div className="label">
                            <span className="label-text">Logo</span>
                            {form.logoUrl ? (
                                <button type="button" className="btn btn-ghost btn-xs" onClick={() => setForm((current) => ({ ...current, logoUrl: "" }))}>
                                    Hapus
                                </button>
                            ) : null}
                        </div>
                        <input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            className="file-input file-input-bordered w-full"
                            onChange={handleLogoUpload}
                            disabled={isBusy}
                        />
                    </label>
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <button type="button" className="btn btn-outline" onClick={() => setCreateOpen(false)} disabled={isBusy}>
                            Batal
                        </button>
                        <button type="submit" className={`btn btn-primary ${isPending ? "loading" : ""}`} disabled={isBusy}>
                            {isPending ? "Menyimpan" : "Buat Team"}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
