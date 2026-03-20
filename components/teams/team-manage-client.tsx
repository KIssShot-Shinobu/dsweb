"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { MoreVertical, UserPlus } from "lucide-react";
import { ConfirmModal } from "@/components/dashboard/confirm-modal";
import { Modal } from "@/components/dashboard/modal";
import { useToast } from "@/components/dashboard/toast";
import { TeamAvatar } from "@/components/teams/team-avatar";
import { ImageCropModal } from "@/components/ui/image-crop-modal";
import type { TeamView } from "@/components/teams/types";
import { normalizeAssetUrl } from "@/lib/asset-url";
import { dashboardStackCls, heroKickerCls, inputCls, labelCls } from "@/components/dashboard/form-styles";

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
    returnHref = "/teams",
    rosterLocked = false,
}: {
    team: TeamView;
    candidates: Candidate[];
    returnHref?: string;
    rosterLocked?: boolean;
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [isWorking, setIsWorking] = useState(false);
    const { success, error: toastError, warning } = useToast();
    const [inviteOpen, setInviteOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCandidate, setSelectedCandidate] = useState(candidates[0]?.id ?? "");
    const [removeTarget, setRemoveTarget] = useState<Member | null>(null);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [cropState, setCropState] = useState<{
        open: boolean;
        imageSrc: string | null;
        fileName: string;
        fileType: string;
    }>({
        open: false,
        imageSrc: null,
        fileName: "logo.jpg",
        fileType: "image/jpeg",
    });
    const logoInputRef = useRef<HTMLInputElement | null>(null);
    const [form, setForm] = useState({
        name: team.name,
        description: team.description || "",
        logoUrl: team.logoUrl || "",
    });

    const viewerRole = team.viewerMembership?.role || "PLAYER";
    const canInvite = team.permissions.canInvite && !rosterLocked;
    const canPromote = team.permissions.canPromote;
    const canTransfer = team.permissions.canTransferCaptain;
    const canEdit = team.permissions.canEditTeam;
    const canDelete = team.permissions.canDelete;
    const isBusy = isPending || isWorking || uploadingLogo;
    const canOpenSettings = canEdit || canDelete;

    const runAction = async (url: string, init: RequestInit, successMessage: string) => {
        setIsWorking(true);

        try {
            const response = await fetch(url, init);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || data.message || "Aksi gagal diproses");
            }

            success(successMessage);
            startTransition(() => {
                router.refresh();
            });
            return true;
        } catch (actionError) {
            toastError(actionError instanceof Error ? actionError.message : "Aksi gagal diproses");
            return false;
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
        if (rosterLocked) {
            warning("Roster terkunci karena turnamen sedang berjalan.");
            return;
        }
        if (!selectedCandidate) {
            warning("Pilih user yang ingin diundang");
            return;
        }

        const ok = await runAction(
            "/api/team/invite",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ teamId: team.id, userId: selectedCandidate }),
            },
            "Invite berhasil dikirim."
        );
        if (ok) {
            setInviteOpen(false);
        }
    };

    const handleUpdateTeam = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        await runAction(
            "/api/team/update",
            {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ teamId: team.id, data: form }),
            },
            "Informasi team berhasil diperbarui."
        );
    };

    const handleLogoUpload = async (file: File) => {
        setUploadingLogo(true);

        try {
            const payload = new FormData();
            payload.append("file", file);

            const response = await fetch("/api/upload", { method: "POST", body: payload });
            const data = await response.json();

            if (!response.ok || !data?.success || !data?.url) {
                throw new Error(data?.message || "Gagal upload logo team.");
            }

            setForm((current) => ({ ...current, logoUrl: data.url }));
            success("Logo team berhasil diupload.");
        } catch (actionError) {
            toastError(actionError instanceof Error ? actionError.message : "Gagal upload logo team.");
        } finally {
            setUploadingLogo(false);
        }
    };

    const readFileAsDataUrl = (file: File) =>
        new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(new Error("Gagal membaca file."));
            reader.readAsDataURL(file);
        });

    const handlePromote = async (memberId: string, role: string) => {
        await runAction(
            "/api/team/member/promote",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ teamId: team.id, memberId, role }),
            },
            "Role member berhasil diperbarui."
        );
    };

    const handleRemove = async (memberId: string) => {
        if (rosterLocked) {
            warning("Roster terkunci karena turnamen sedang berjalan.");
            return;
        }
        await runAction(
            "/api/team/member/remove",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ teamId: team.id, memberId }),
            },
            "Member berhasil dikeluarkan dari team."
        );
    };

    const handleTransferCaptain = async (memberId: string) => {
        await runAction(
            "/api/team/member/transfer-captain",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ teamId: team.id, memberId }),
            },
            "Captain berhasil dipindahkan."
        );
    };

    const handleDeleteTeam = async () => {
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

            success("Team berhasil dihapus.");
            startTransition(() => {
                router.push(returnHref);
                router.refresh();
            });
        } catch (actionError) {
            toastError(actionError instanceof Error ? actionError.message : "Gagal menghapus team");
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
    const pendingJoinRequests = team.joinRequests;
    const logoPreviewUrl = normalizeAssetUrl(form.logoUrl);
    const teamInitials = team.name
        .split(/[\s._-]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("") || "DS";

    const handleJoinRequestDecision = async (requestId: string, decision: "accept" | "reject") => {
        if (rosterLocked && decision === "accept") {
            warning("Roster terkunci karena turnamen sedang berjalan.");
            return false;
        }
        const ok = await runAction(
            `/api/team/request-join/${decision}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ joinRequestId: requestId }),
            },
            decision === "accept" ? "Request join disetujui." : "Request join ditolak."
        );

        return ok;
    };

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
                <ul className="menu menu-sm dropdown-content z-[80] mt-2 w-56 rounded-box border border-base-200 bg-base-100 p-2 shadow">
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
                            <button
                                type="button"
                                className="text-error"
                                onClick={() => setRemoveTarget(member)}
                                disabled={isBusy || rosterLocked}
                            >
                                Remove Member
                            </button>
                        </li>
                    ) : null}
                </ul>
            </div>
        );
    };

    return (
        <div className={dashboardStackCls}>
            {rosterLocked ? (
                <div className="alert alert-warning">
                    <span>Roster terkunci karena turnamen sedang berjalan. Aksi tambah/hapus member akan ditolak.</span>
                </div>
            ) : null}
            <section className="card border border-base-300 bg-base-100 shadow-sm">
                <div className="card-body">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-2">
                            <div className={heroKickerCls}>Team</div>
                            <h2 className="text-2xl font-bold text-base-content">{team.name}</h2>
                            <p className="max-w-2xl text-sm text-base-content/70">
                                {team.description || "Belum ada deskripsi team. Tambahkan di bagian pengaturan."}
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <span className="badge badge-outline">{team.memberCount} member aktif</span>
                                <span className={`badge ${getRoleBadgeClass(viewerRole)}`}>{getRoleLabel(viewerRole)}</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-start sm:justify-end">
                            <TeamAvatar name={team.name} avatarUrl={team.logoUrl} size="xl" />
                        </div>
                    </div>
                </div>
            </section>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
                <section className="card border border-base-300 bg-base-100 shadow-sm overflow-visible">
                    <div className="card-body overflow-visible">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 className="card-title">Ringkasan Team</h2>
                                <p className="text-sm text-base-content/70">Info cepat untuk pengurus roster.</p>
                            </div>
                            <span className={`badge ${team.isActive ? "badge-success" : "badge-ghost"}`}>
                                {team.isActive ? "Aktif" : "Nonaktif"}
                            </span>
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-box border border-base-300 bg-base-200/40 p-3">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-base-content/50">Dibuat</div>
                                <div className="mt-1 font-semibold text-base-content">{formatDate(team.createdAt)}</div>
                            </div>
                            <div className="rounded-box border border-base-300 bg-base-200/40 p-3">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-base-content/50">Terakhir Update</div>
                                <div className="mt-1 font-semibold text-base-content">{formatDate(team.updatedAt)}</div>
                            </div>
                            <div className="rounded-box border border-base-300 bg-base-200/40 p-3">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-base-content/50">Captain</div>
                                <div className="mt-1 font-semibold text-base-content">{captainName}</div>
                            </div>
                            <div className="rounded-box border border-base-300 bg-base-200/40 p-3">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-base-content/50">Vice Captain</div>
                                <div className="mt-1 font-semibold text-base-content line-clamp-1">{viceCaptainSummary}</div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="card border border-base-300 bg-base-100 shadow-sm">
                    <div className="card-body">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 className="card-title">Team Members</h2>
                                <p className="text-sm text-base-content/70">Role dan roster team.</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="badge badge-outline">{team.memberCount} members</span>
                                {team.invites.length > 0 ? (
                                    <span className="badge badge-secondary">Pending {team.invites.length}</span>
                                ) : null}
                                {pendingJoinRequests.length > 0 ? (
                                    <span className="badge badge-accent">Join Request {pendingJoinRequests.length}</span>
                                ) : null}
                                {canInvite ? (
                                    <button type="button" className="btn btn-primary btn-sm gap-2" onClick={() => setInviteOpen(true)}>
                                        <UserPlus className="h-4 w-4" />
                                        Invite Player
                                    </button>
                                ) : null}
                                {canOpenSettings ? (
                                    <div className="dropdown dropdown-end">
                                        <button type="button" className="btn btn-ghost btn-sm btn-circle">
                                            <MoreVertical className="h-4 w-4" />
                                        </button>
                                        <ul className="menu menu-sm dropdown-content z-[80] mt-2 w-44 rounded-box border border-base-200 bg-base-100 p-2 shadow">
                                            <li>
                                                <button type="button" onClick={() => setSettingsOpen(true)}>
                                                    Owner Tools
                                                </button>
                                            </li>
                                        </ul>
                                    </div>
                                ) : null}
                            </div>
                        </div>

                    {canInvite && pendingJoinRequests.length > 0 ? (
                        <div className="mt-4 rounded-box border border-base-300 bg-base-200/50 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <div className="text-sm font-semibold">Permintaan Join</div>
                                    <div className="text-xs text-base-content/60">
                                        Setujui atau tolak permintaan masuk ke team.
                                    </div>
                                </div>
                                <span className="badge badge-secondary">{pendingJoinRequests.length} request</span>
                            </div>
                            <div className="mt-3 space-y-3">
                                {pendingJoinRequests.map((request) => (
                                    <div
                                        key={request.id}
                                        className="flex flex-wrap items-center justify-between gap-3 rounded-box border border-base-300 bg-base-100/70 p-3"
                                    >
                                        <div className="flex items-center gap-3">
                                            <TeamAvatar name={request.user.fullName} avatarUrl={request.user.avatarUrl} size="sm" />
                                            <div>
                                                <div className="font-semibold">{request.user.fullName}</div>
                                                <div className="text-xs text-base-content/60">
                                                    @{request.user.username} - {request.user.email}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                className="btn btn-primary btn-xs"
                                                onClick={() => handleJoinRequestDecision(request.id, "accept")}
                                                disabled={isBusy}
                                            >
                                                Terima
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-outline btn-error btn-xs"
                                                onClick={() => handleJoinRequestDecision(request.id, "reject")}
                                                disabled={isBusy}
                                            >
                                                Tolak
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    {team.members.length === 0 ? (
                        <div className="rounded-box border border-dashed border-base-300 bg-base-200/40 p-5 text-sm text-base-content/70">
                            Belum ada member di roster ini.
                        </div>
                    ) : (
                        <>
                            <div className="mt-4 hidden md:block">
                                <div className="overflow-x-auto md:overflow-visible">
                                    <div className="min-w-[720px] overflow-visible md:min-w-0">
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
                                </div>
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
            </div>

            <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite Player" size="md">
                <form className="space-y-5" onSubmit={handleInvite}>
                    <label className="form-control w-full gap-2">
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
                    <label className="form-control w-full gap-2">
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
                    <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                        <button type="button" className="btn btn-outline" onClick={() => setInviteOpen(false)} disabled={isBusy}>
                            Batal
                        </button>
                        <button type="submit" className={`btn btn-primary ${isBusy ? "loading" : ""}`} disabled={isBusy || filteredCandidates.length === 0}>
                            Kirim Invite
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Owner Tools" size="md">
                {canEdit ? (
                    <form className="space-y-4" onSubmit={handleUpdateTeam}>
                        <label className="block">
                            <span className={labelCls}>Nama Team</span>
                            <input
                                className={inputCls}
                                value={form.name}
                                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                                placeholder="Contoh: Duel Standby Alpha"
                            />
                        </label>
                        <label className="block">
                            <span className={labelCls}>Deskripsi</span>
                            <textarea
                                className={`${inputCls} min-h-[104px] resize-y`}
                                value={form.description}
                                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                                placeholder="Ringkas misi atau gaya bermain team."
                            />
                        </label>
                        <div className="space-y-3">
                            <label className={labelCls}>Upload Logo</label>
                            <input
                                ref={logoInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/jpg,image/webp"
                                className="hidden"
                                onChange={async (event) => {
                                    const inputEl = event.currentTarget;
                                    const file = event.target.files?.[0];
                                    if (!file) return;
                                    try {
                                        const previewUrl = await readFileAsDataUrl(file);
                                        setCropState({
                                            open: true,
                                            imageSrc: previewUrl,
                                            fileName: file.name || "logo.jpg",
                                            fileType: file.type || "image/jpeg",
                                        });
                                    } catch {
                                        toastError("Gagal memuat gambar untuk crop.");
                                    }
                                    inputEl.value = "";
                                }}
                                disabled={isBusy}
                            />
                            <div className="flex items-center justify-center">
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => logoInputRef.current?.click()}
                                        disabled={isBusy}
                                        className="group relative h-24 w-24 overflow-hidden rounded-3xl border border-base-300 bg-primary/10 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
                                        title="Klik untuk mengganti logo"
                                    >
                                        {logoPreviewUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={logoPreviewUrl} alt="Logo team" className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center text-xl font-black text-primary">
                                                {teamInitials}
                                            </div>
                                        )}
                                        <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/55 via-black/10 to-transparent px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                                            {uploadingLogo ? "Memproses" : "Ganti"}
                                        </div>
                                    </button>

                                    {form.logoUrl ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setForm((current) => ({ ...current, logoUrl: "" }));
                                                warning("Logo dihapus dari draft. Simpan perubahan untuk menerapkan.");
                                            }}
                                            disabled={isBusy}
                                            className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border border-base-100 bg-error text-error-content shadow-lg transition-all hover:scale-105 hover:bg-error/85 disabled:cursor-not-allowed disabled:opacity-70"
                                            title="Hapus logo"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M3 6h18" />
                                                <path d="M8 6V4h8v2" />
                                                <path d="M19 6l-1 14H6L5 6" />
                                                <path d="M10 11v6" />
                                                <path d="M14 11v6" />
                                            </svg>
                                        </button>
                                    ) : null}
                                </div>
                            </div>
                            {uploadingLogo ? <p className="text-xs text-base-content/45 text-center">Mengupload logo...</p> : null}
                        </div>
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
                    <div className="alert alert-info">Role Anda hanya bisa melihat roster dan aktivitas team.</div>
                )}
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

            <ImageCropModal
                open={cropState.open}
                imageSrc={cropState.imageSrc}
                title="Crop Logo Team"
                aspect={1}
                outputType={cropState.fileType}
                onCancel={() =>
                    setCropState((prev) => ({
                        ...prev,
                        open: false,
                        imageSrc: null,
                    }))
                }
                onComplete={async (blob) => {
                    const croppedFile = new File([blob], cropState.fileName, { type: cropState.fileType });
                    await handleLogoUpload(croppedFile);
                    setCropState((prev) => ({
                        ...prev,
                        open: false,
                        imageSrc: null,
                    }));
                }}
            />
        </div>
    );
}
