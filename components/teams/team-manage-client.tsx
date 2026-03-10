"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import { MoreVertical, UserPlus } from "lucide-react";
import { ConfirmModal } from "@/components/dashboard/confirm-modal";
import { Modal } from "@/components/dashboard/modal";
import { TeamAvatar } from "@/components/teams/team-avatar";
import type { TeamView } from "@/components/teams/types";

const ROLE_OPTIONS = [
    { value: "VICE_CAPTAIN", label: "Vice Captain" },
    { value: "PLAYER", label: "Player" },
    { value: "COACH", label: "Coach" },
    { value: "MANAGER", label: "Manager" },
];

const ROLE_LABELS: Record<string, string> = {
    CAPTAIN: "Captain",
    VICE_CAPTAIN: "Vice Captain",
    PLAYER: "Player",
    COACH: "Coach",
    MANAGER: "Manager",
};

const ROLE_BADGES: Record<string, string> = {
    CAPTAIN: "badge-primary",
    VICE_CAPTAIN: "badge-secondary",
    COACH: "badge-accent",
    MANAGER: "badge-warning",
    PLAYER: "badge-neutral",
};

function formatDate(value: string) {
    return new Date(value).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function getRoleLabel(role: string) {
    return ROLE_LABELS[role] ?? role;
}

function getRoleBadgeClass(role: string) {
    return ROLE_BADGES[role] ?? "badge-ghost";
}

type Candidate = {
    id: string;
    fullName: string;
    username: string;
    email: string;
    avatarUrl: string | null;
};

type Member = TeamView["members"][number];

export function TeamManageClient({
    team,
    candidates,
}: {
    team: TeamView;
    candidates: Candidate[];
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [isWorking, setIsWorking] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [inviteOpen, setInviteOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCandidate, setSelectedCandidate] = useState(candidates[0]?.id ?? "");
    const [removeTarget, setRemoveTarget] = useState<Member | null>(null);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [form, setForm] = useState({
        name: team.name,
        slug: team.slug,
        description: team.description || "",
        logoUrl: team.logoUrl || "",
    });

    const viewerRole = team.viewerMembership?.role || "PLAYER";
    const canInvite = team.permissions.canInvite;
    const canPromote = team.permissions.canPromote;
    const canTransfer = team.permissions.canTransferCaptain;
    const canEdit = team.permissions.canEditTeam;
    const canDelete = team.permissions.canDelete;
    const isBusy = isPending || isWorking;

    const runAction = async (url: string, init: RequestInit, successMessage: string) => {
        setError(null);
        setMessage(null);
        setIsWorking(true);

        try {
            const response = await fetch(url, init);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || data.message || "Aksi gagal diproses");
            }

            setMessage(successMessage);
            startTransition(() => {
                router.refresh();
            });
        } finally {
            setIsWorking(false);
        }
    };

    const availableCandidates = useMemo(
        () => candidates.filter((candidate) => !team.invites.some((invite) => invite.userId === candidate.id)),
        [candidates, team.invites]
    );

    const filteredCandidates = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return availableCandidates;

        return availableCandidates.filter((candidate) => {
            const haystack = `${candidate.fullName} ${candidate.username} ${candidate.email}`.toLowerCase();
            return haystack.includes(query);
        });
    }, [availableCandidates, searchQuery]);

    useEffect(() => {
        if (!selectedCandidate || !availableCandidates.some((candidate) => candidate.id === selectedCandidate)) {
            setSelectedCandidate(availableCandidates[0]?.id ?? "");
        }
    }, [availableCandidates, selectedCandidate]);

    const handleInvite = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!selectedCandidate) {
            setError("Pilih user yang ingin diundang");
            return;
        }

        try {
            await runAction(
                "/api/team/invite",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ teamId: team.id, userId: selectedCandidate }),
                },
                "Invite berhasil dikirim."
            );
            setInviteOpen(false);
        } catch (actionError) {
            setError(actionError instanceof Error ? actionError.message : "Gagal mengirim invite");
        }
    };

    const handleUpdateTeam = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        try {
            await runAction(
                "/api/team/update",
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ teamId: team.id, data: form }),
                },
                "Informasi team berhasil diperbarui."
            );
        } catch (actionError) {
            setError(actionError instanceof Error ? actionError.message : "Gagal memperbarui team");
        }
    };

    const handlePromote = async (memberId: string, role: string) => {
        try {
            await runAction(
                "/api/team/member/promote",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ teamId: team.id, memberId, role }),
                },
                "Role member berhasil diperbarui."
            );
        } catch (actionError) {
            setError(actionError instanceof Error ? actionError.message : "Gagal mengubah role");
        }
    };

    const handleRemove = async (memberId: string) => {
        try {
            await runAction(
                "/api/team/member/remove",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ teamId: team.id, memberId }),
                },
                "Member berhasil dikeluarkan dari team."
            );
        } catch (actionError) {
            setError(actionError instanceof Error ? actionError.message : "Gagal mengeluarkan member");
        }
    };

    const handleTransferCaptain = async (memberId: string) => {
        try {
            await runAction(
                "/api/team/member/transfer-captain",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ teamId: team.id, memberId }),
                },
                "Captain berhasil dipindahkan."
            );
        } catch (actionError) {
            setError(actionError instanceof Error ? actionError.message : "Gagal mentransfer captain");
        }
    };

    const handleDeleteTeam = async () => {
        setError(null);
        setMessage(null);
        setIsWorking(true);

        try {
            const response = await fetch("/api/team/delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ teamId: team.id }),
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || data.message || "Gagal menghapus team");
            }

            setMessage("Team berhasil dihapus.");
            startTransition(() => {
                router.push("/teams");
                router.refresh();
            });
        } catch (actionError) {
            setError(actionError instanceof Error ? actionError.message : "Gagal menghapus team");
        } finally {
            setIsWorking(false);
        }
    };

    const canRemoveMember = (memberRole: string, userId: string) => {
        if (userId === team.viewerMembership?.userId) {
            return false;
        }

        if (viewerRole === "CAPTAIN") {
            return memberRole !== "CAPTAIN";
        }

        if (viewerRole === "VICE_CAPTAIN") {
            return memberRole !== "CAPTAIN";
        }

        return false;
    };

    const captainName = team.captain?.user.fullName ?? "Belum ada captain";
    const viceCaptainSummary =
        team.viceCaptains.length > 0 ? team.viceCaptains.map((member) => member.user.fullName).join(", ") : "Belum ada vice captain";

    const renderMemberActions = (member: Member) => {
        const canChangeRole = canPromote && member.role !== "CAPTAIN";
        const canTransferCaptain = canTransfer && member.role !== "CAPTAIN";
        const canRemove = canRemoveMember(member.role, member.userId);
        const hasActions = canChangeRole || canTransferCaptain || canRemove;

        if (!hasActions) {
            return <span className="text-xs text-base-content/50">Tidak ada aksi</span>;
        }

        return (
            <div className="dropdown dropdown-end">
                <button type="button" className="btn btn-ghost btn-sm btn-circle" disabled={isBusy}>
                    <MoreVertical className="h-4 w-4" />
                </button>
                <ul className="menu menu-sm dropdown-content z-[2] mt-2 w-56 rounded-box border border-base-200 bg-base-100 p-2 shadow">
                    {canChangeRole ? (
                        <>
                            <li className="menu-title text-[10px] uppercase tracking-[0.2em] text-base-content/50">Role</li>
                            {ROLE_OPTIONS.map((option) => (
                                <li key={option.value}>
                                    <button
                                        type="button"
                                        onClick={() => handlePromote(member.id, option.value)}
                                        disabled={isBusy || member.role === option.value}
                                    >
                                        Set sebagai {option.label}
                                    </button>
                                </li>
                            ))}
                        </>
                    ) : null}
                    {canTransferCaptain ? (
                        <li>
                            <button type="button" onClick={() => handleTransferCaptain(member.id)} disabled={isBusy}>
                                Transfer Captain
                            </button>
                        </li>
                    ) : null}
                    {canRemove ? (
                        <li>
                            <button type="button" className="text-error" onClick={() => setRemoveTarget(member)} disabled={isBusy}>
                                Remove Member
                            </button>
                        </li>
                    ) : null}
                </ul>
            </div>
        );
    };

    return (
        <div className="space-y-8">
            {message ? <div className="alert alert-success shadow-sm">{message}</div> : null}
            {error ? <div className="alert alert-error shadow-sm">{error}</div> : null}

            <section className="card border border-base-300 bg-base-100 shadow-sm">
                <div className="card-body gap-6">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                            <TeamAvatar name={team.name} avatarUrl={team.logoUrl} size="lg" />
                            <div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <h2 className="card-title text-2xl">{team.name}</h2>
                                    <span className="badge badge-outline">/{team.slug}</span>
                                </div>
                                <p className="mt-2 text-sm text-base-content/70">
                                    {team.description || "Belum ada deskripsi team. Tambahkan di bagian pengaturan."}
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <span className="badge badge-outline">{team.memberCount} member aktif</span>
                                    <span className={`badge ${getRoleBadgeClass(viewerRole)}`}>{getRoleLabel(viewerRole)}</span>
                                </div>
                            </div>
                        </div>
                        {canInvite ? (
                            <button type="button" className="btn btn-primary gap-2" onClick={() => setInviteOpen(true)}>
                                <UserPlus className="h-4 w-4" />
                                Invite Player
                            </button>
                        ) : null}
                    </div>

                    <div className="stats stats-vertical w-full border border-base-300 bg-base-200/40 shadow-sm sm:stats-horizontal">
                        <div className="stat">
                            <div className="stat-title">Total Members</div>
                            <div className="stat-value text-primary">{team.memberCount}</div>
                            <div className="stat-desc">Roster aktif</div>
                        </div>
                        <div className="stat">
                            <div className="stat-title">Captain</div>
                            <div className="stat-value text-base-content">{captainName}</div>
                            <div className="stat-desc">Role utama</div>
                        </div>
                        <div className="stat">
                            <div className="stat-title">Vice Captains</div>
                            <div className="stat-value text-secondary">{team.viceCaptains.length}</div>
                            <div className="stat-desc">{viceCaptainSummary}</div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="card border border-base-300 bg-base-100 shadow-sm">
                <div className="card-body">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="card-title">Team Information</h2>
                            <p className="text-sm text-base-content/70">Rangkuman data team untuk memastikan semua anggota punya konteks yang sama.</p>
                        </div>
                        <span className={`badge ${team.isActive ? "badge-success" : "badge-ghost"}`}>
                            {team.isActive ? "Active" : "Inactive"}
                        </span>
                    </div>
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        <div className="rounded-box border border-base-300 bg-base-200/40 p-4">
                            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-base-content/50">Slug</div>
                            <div className="mt-2 font-semibold text-base-content">/{team.slug}</div>
                        </div>
                        <div className="rounded-box border border-base-300 bg-base-200/40 p-4">
                            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-base-content/50">Dibuat</div>
                            <div className="mt-2 font-semibold text-base-content">{formatDate(team.createdAt)}</div>
                        </div>
                        <div className="rounded-box border border-base-300 bg-base-200/40 p-4">
                            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-base-content/50">Captain</div>
                            <div className="mt-2 font-semibold text-base-content">{captainName}</div>
                        </div>
                        <div className="rounded-box border border-base-300 bg-base-200/40 p-4">
                            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-base-content/50">Vice Captain</div>
                            <div className="mt-2 font-semibold text-base-content">{viceCaptainSummary}</div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="card border border-base-300 bg-base-100 shadow-sm">
                <div className="card-body">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="card-title">Team Members</h2>
                            <p className="text-sm text-base-content/70">Kelola role, transfer captain, dan jaga roster tetap rapi.</p>
                        </div>
                        <span className="badge badge-outline">{team.memberCount} members</span>
                    </div>

                    {team.members.length === 0 ? (
                        <div className="rounded-box border border-dashed border-base-300 bg-base-200/40 p-5 text-sm text-base-content/70">
                            Belum ada member di roster ini.
                        </div>
                    ) : (
                        <>
                            <div className="mt-4 hidden overflow-x-auto md:block">
                                <table className="table table-zebra">
                                    <thead>
                                        <tr>
                                            <th>Avatar</th>
                                            <th>Username</th>
                                            <th>Role</th>
                                            <th>Joined Date</th>
                                            <th className="text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {team.members.map((member) => (
                                            <tr key={member.id}>
                                                <td>
                                                    <TeamAvatar name={member.user.fullName} avatarUrl={member.user.avatarUrl} size="sm" />
                                                </td>
                                                <td>
                                                    <div className="font-semibold">{member.user.fullName}</div>
                                                    <div className="text-xs text-base-content/60">
                                                        @{member.user.username} - {member.user.email}
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`badge ${getRoleBadgeClass(member.role)}`}>{getRoleLabel(member.role)}</span>
                                                </td>
                                                <td>{formatDate(member.joinedAt)}</td>
                                                <td className="text-right">{renderMemberActions(member)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-4 grid gap-4 md:hidden">
                                {team.members.map((member) => (
                                    <div key={member.id} className="card border border-base-300 bg-base-100 shadow-sm">
                                        <div className="card-body gap-4 p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <TeamAvatar name={member.user.fullName} avatarUrl={member.user.avatarUrl} size="sm" />
                                                    <div>
                                                        <div className="font-semibold">{member.user.fullName}</div>
                                                        <div className="text-xs text-base-content/60">
                                                            @{member.user.username} - {member.user.email}
                                                        </div>
                                                    </div>
                                                </div>
                                                <span className={`badge ${getRoleBadgeClass(member.role)}`}>{getRoleLabel(member.role)}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-base-content/60">
                                                <span>Bergabung {formatDate(member.joinedAt)}</span>
                                                {renderMemberActions(member)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </section>

            <section className="card border border-base-300 bg-base-100 shadow-sm">
                <div className="card-body">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="card-title">Pending Invites</h2>
                            <p className="text-sm text-base-content/70">Pantau undangan yang belum direspons.</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="badge badge-secondary">{team.invites.length} pending</span>
                            {canInvite ? (
                                <button type="button" className="btn btn-outline btn-secondary btn-sm" onClick={() => setInviteOpen(true)}>
                                    Invite Player
                                </button>
                            ) : null}
                        </div>
                    </div>

                    {!canInvite ? <div className="alert alert-warning mt-4">Role Anda tidak memiliki izin untuk mengirim invite.</div> : null}

                    {team.invites.length > 0 ? (
                        <>
                            <div className="mt-4 hidden overflow-x-auto md:block">
                                <table className="table table-zebra">
                                    <thead>
                                        <tr>
                                            <th>User</th>
                                            <th>Diundang Oleh</th>
                                            <th>Dibuat</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {team.invites.map((invite) => (
                                            <tr key={invite.id}>
                                                <td>
                                                    <div className="font-semibold">{invite.user.fullName}</div>
                                                    <div className="text-xs text-base-content/60">@{invite.user.username}</div>
                                                </td>
                                                <td>{invite.invitedBy.fullName}</td>
                                                <td>{formatDate(invite.createdAt)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-4 grid gap-4 md:hidden">
                                {team.invites.map((invite) => (
                                    <div key={invite.id} className="card border border-base-300 bg-base-100 shadow-sm">
                                        <div className="card-body gap-3 p-4">
                                            <div className="font-semibold">{invite.user.fullName}</div>
                                            <div className="text-xs text-base-content/60">
                                                @{invite.user.username} - Diundang oleh {invite.invitedBy.fullName}
                                            </div>
                                            <div className="text-xs text-base-content/60">Dikirim {formatDate(invite.createdAt)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="mt-4 rounded-box border border-dashed border-base-300 bg-base-200/40 p-4 text-sm text-base-content/70">
                            Belum ada invite pending.
                        </div>
                    )}
                </div>
            </section>

            <section className="card border border-base-300 bg-base-100 shadow-sm">
                <div className="card-body">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="card-title">Team Settings</h2>
                            <p className="text-sm text-base-content/70">Perbarui identitas team agar tampil konsisten di komunitas.</p>
                        </div>
                        <span className="badge badge-outline">Owner tools</span>
                    </div>

                    {canEdit ? (
                        <form className="mt-5 space-y-4" onSubmit={handleUpdateTeam}>
                            <div className="grid gap-4 md:grid-cols-2">
                                <label className="form-control w-full">
                                    <div className="label">
                                        <span className="label-text">Nama Team</span>
                                    </div>
                                    <input
                                        className="input input-bordered w-full"
                                        value={form.name}
                                        onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
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
                                />
                            </label>
                            <label className="form-control w-full">
                                <div className="label">
                                    <span className="label-text">Logo URL</span>
                                </div>
                                <input
                                    className="input input-bordered w-full"
                                    value={form.logoUrl}
                                    onChange={(event) => setForm((current) => ({ ...current, logoUrl: event.target.value }))}
                                    placeholder="/uploads/team-logo.png"
                                />
                            </label>
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <button type="submit" className={`btn btn-primary ${isBusy ? "loading" : ""}`} disabled={isBusy}>
                                    {isBusy ? "Menyimpan" : "Simpan Perubahan"}
                                </button>
                                {canDelete ? (
                                    <button
                                        type="button"
                                        className="btn btn-outline btn-error"
                                        onClick={() => setDeleteOpen(true)}
                                        disabled={isBusy || team.memberCount > 1}
                                    >
                                        Delete Team
                                    </button>
                                ) : null}
                            </div>
                            {canDelete && team.memberCount > 1 ? (
                                <div className="alert alert-warning">
                                    Keluarkan semua member terlebih dahulu sebelum menghapus team.
                                </div>
                            ) : null}
                        </form>
                    ) : (
                        <div className="alert alert-info mt-4">Role Anda hanya bisa melihat roster dan aktivitas team.</div>
                    )}
                </div>
            </section>

            <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite Player" size="md">
                <form className="space-y-4" onSubmit={handleInvite}>
                    <label className="form-control w-full">
                        <div className="label">
                            <span className="label-text">Cari user</span>
                        </div>
                        <input
                            className="input input-bordered w-full"
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder="Cari berdasarkan nama, username, atau email"
                        />
                    </label>
                    <label className="form-control w-full">
                        <div className="label">
                            <span className="label-text">Pilih user</span>
                        </div>
                        <select
                            className="select select-bordered w-full"
                            value={selectedCandidate}
                            onChange={(event) => setSelectedCandidate(event.target.value)}
                        >
                            {filteredCandidates.length === 0 ? <option value="">Tidak ada kandidat tersedia</option> : null}
                            {filteredCandidates.map((candidate) => (
                                <option key={candidate.id} value={candidate.id}>
                                    {candidate.fullName} (@{candidate.username})
                                </option>
                            ))}
                        </select>
                    </label>
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <button type="button" className="btn btn-outline" onClick={() => setInviteOpen(false)} disabled={isBusy}>
                            Batal
                        </button>
                        <button type="submit" className={`btn btn-primary ${isBusy ? "loading" : ""}`} disabled={isBusy || filteredCandidates.length === 0}>
                            Kirim Invite
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal
                open={Boolean(removeTarget)}
                title="Keluarkan Member?"
                message={
                    removeTarget
                        ? `Anda akan menghapus ${removeTarget.user.fullName} dari roster. Aksi ini tidak bisa dibatalkan.`
                        : "Anda akan menghapus member dari roster."
                }
                confirmLabel="Remove Member"
                cancelLabel="Batal"
                danger
                onCancel={() => setRemoveTarget(null)}
                onConfirm={async () => {
                    if (!removeTarget) return;
                    await handleRemove(removeTarget.id);
                    setRemoveTarget(null);
                }}
            />

            <ConfirmModal
                open={deleteOpen}
                title="Hapus Team?"
                message="Team akan dihapus permanen dan seluruh data roster terhapus. Pastikan roster sudah kosong sebelum melanjutkan."
                confirmLabel="Hapus Team"
                cancelLabel="Batal"
                danger
                onCancel={() => setDeleteOpen(false)}
                onConfirm={async () => {
                    await handleDeleteTeam();
                    setDeleteOpen(false);
                }}
            />
        </div>
    );
}
