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
import { useLocale } from "@/hooks/use-locale";
import { formatDate } from "@/lib/i18n/format";

const ROLE_BADGES: Record<string, string> = {
    CAPTAIN: "badge-primary",
    VICE_CAPTAIN: "badge-secondary",
    COACH: "badge-accent",
    MANAGER: "badge-warning",
    PLAYER: "badge-neutral",
};

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
    const { t, locale } = useLocale();
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

    const roleLabels = t.teams.roles;
    const getRoleLabel = (role: string) => roleLabels[role as keyof typeof roleLabels] ?? role;
    const roleOptions = [
        { value: "VICE_CAPTAIN", label: roleLabels.VICE_CAPTAIN },
        { value: "PLAYER", label: roleLabels.PLAYER },
        { value: "COACH", label: roleLabels.COACH },
        { value: "MANAGER", label: roleLabels.MANAGER },
    ];
    const viewerRole = team.viewerMembership?.role || "PLAYER";
    const formatDateLabel = (value: string) => formatDate(value, locale, { day: "numeric", month: "short", year: "numeric" });
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
                throw new Error(data.error || data.message || t.teams.manage.errors.actionFailed);
            }

            success(successMessage);
            startTransition(() => {
                router.refresh();
            });
            return true;
        } catch (actionError) {
            toastError(actionError instanceof Error ? actionError.message : t.teams.manage.errors.actionFailed);
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
            warning(t.teams.manage.errors.rosterLocked);
            return;
        }
        if (!selectedCandidate) {
            warning(t.teams.manage.errors.selectUser);
            return;
        }

        const ok = await runAction(
            "/api/team/invite",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ teamId: team.id, userId: selectedCandidate }),
            },
            t.teams.manage.success.inviteSent
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
            t.teams.manage.success.teamUpdated
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
                throw new Error(data?.message || t.teams.manage.errors.logoUploadFailed);
            }

            setForm((current) => ({ ...current, logoUrl: data.url }));
            success(t.teams.manage.success.logoUploaded);
        } catch (actionError) {
            toastError(actionError instanceof Error ? actionError.message : t.teams.manage.errors.logoUploadFailed);
        } finally {
            setUploadingLogo(false);
        }
    };

    const readFileAsDataUrl = (file: File) =>
        new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(new Error(t.teams.manage.errors.readFileFailed));
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
            t.teams.manage.success.roleUpdated
        );
    };

    const handleRemove = async (memberId: string) => {
        if (rosterLocked) {
            warning(t.teams.manage.errors.rosterLocked);
            return;
        }
        await runAction(
            "/api/team/member/remove",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ teamId: team.id, memberId }),
            },
            t.teams.manage.success.memberRemoved
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
            t.teams.manage.success.captainTransferred
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
                throw new Error(data.error || data.message || t.teams.manage.errors.deleteFailed);
            }

            success(t.teams.manage.success.teamDeleted);
            startTransition(() => {
                router.push(returnHref);
                router.refresh();
            });
        } catch (actionError) {
            toastError(actionError instanceof Error ? actionError.message : t.teams.manage.errors.deleteFailed);
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

    const captainName = team.captain?.user.fullName ?? t.teams.manage.captainEmpty;
    const viceCaptainSummary =
        team.viceCaptains.length > 0
            ? team.viceCaptains.map((member) => member.user.fullName).join(", ")
            : t.teams.manage.viceCaptainEmpty;
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
            warning(t.teams.manage.errors.rosterLocked);
            return false;
        }
        const ok = await runAction(
            `/api/team/request-join/${decision}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ joinRequestId: requestId }),
            },
            decision === "accept" ? t.teams.manage.success.joinApproved : t.teams.manage.success.joinRejected
        );

        return ok;
    };

    const renderMemberActions = (member: Member) => {
        const canChangeRole = canPromote && member.role !== "CAPTAIN";
        const canTransferCaptain = canTransfer && member.role !== "CAPTAIN";
        const canRemove = canRemoveMember(member.role, member.userId);
        const hasActions = canChangeRole || canTransferCaptain || canRemove;

        if (!hasActions) {
            return <span className="text-xs text-base-content/50">{t.teams.manage.noActions}</span>;
        }

        return (
            <div className="dropdown dropdown-end">
                <button type="button" className="btn btn-ghost btn-sm btn-circle" disabled={isBusy}>
                    <MoreVertical className="h-4 w-4" />
                </button>
                <ul className="menu menu-sm dropdown-content z-[80] mt-2 w-56 rounded-box border border-base-200 bg-base-100 p-2 shadow">
                    {canChangeRole ? (
                        <>
                            <li className="menu-title text-[10px] uppercase tracking-[0.2em] text-base-content/50">
                                {t.teams.manage.roleMenuTitle}
                            </li>
                            {roleOptions.map((option) => (
                                <li key={option.value}>
                                    <button
                                        type="button"
                                        onClick={() => handlePromote(member.id, option.value)}
                                        disabled={isBusy || member.role === option.value}
                                    >
                                        {t.teams.manage.setRoleAs(option.label)}
                                    </button>
                                </li>
                            ))}
                        </>
                    ) : null}
                    {canTransferCaptain ? (
                        <li>
                            <button type="button" onClick={() => handleTransferCaptain(member.id)} disabled={isBusy}>
                                {t.teams.manage.transferCaptain}
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
                                {t.teams.manage.removeMember}
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
                    <span>{t.teams.manage.rosterLockedAlert}</span>
                </div>
            ) : null}
            <section className="card border border-base-300 bg-base-100 shadow-sm">
                <div className="card-body">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-2">
                            <div className={heroKickerCls}>{t.teams.manage.kicker}</div>
                            <h2 className="text-2xl font-bold text-base-content">{team.name}</h2>
                            <p className="max-w-2xl text-sm text-base-content/70">
                                {team.description || t.teams.manage.descriptionEmpty}
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <span className="badge badge-outline">{t.teams.manage.memberCount(team.memberCount)}</span>
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
                                <h2 className="card-title">{t.teams.manage.summaryTitle}</h2>
                                <p className="text-sm text-base-content/70">{t.teams.manage.summarySubtitle}</p>
                            </div>
                            <span className={`badge ${team.isActive ? "badge-success" : "badge-ghost"}`}>
                                {team.isActive ? t.teams.manage.statusActive : t.teams.manage.statusInactive}
                            </span>
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-box border border-base-300 bg-base-200/40 p-3">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-base-content/50">{t.teams.manage.createdLabel}</div>
                                <div className="mt-1 font-semibold text-base-content">{formatDateLabel(team.createdAt)}</div>
                            </div>
                            <div className="rounded-box border border-base-300 bg-base-200/40 p-3">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-base-content/50">{t.teams.manage.updatedLabel}</div>
                                <div className="mt-1 font-semibold text-base-content">{formatDateLabel(team.updatedAt)}</div>
                            </div>
                            <div className="rounded-box border border-base-300 bg-base-200/40 p-3">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-base-content/50">{t.teams.manage.captainLabel}</div>
                                <div className="mt-1 font-semibold text-base-content">{captainName}</div>
                            </div>
                            <div className="rounded-box border border-base-300 bg-base-200/40 p-3">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-base-content/50">{t.teams.manage.viceCaptainLabel}</div>
                                <div className="mt-1 font-semibold text-base-content line-clamp-1">{viceCaptainSummary}</div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="card border border-base-300 bg-base-100 shadow-sm">
                    <div className="card-body">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 className="card-title">{t.teams.manage.membersTitle}</h2>
                                <p className="text-sm text-base-content/70">{t.teams.manage.membersSubtitle}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="badge badge-outline">{t.teams.manage.memberCount(team.memberCount)}</span>
                                {team.invites.length > 0 ? (
                                    <span className="badge badge-secondary">{t.teams.manage.pendingInvites(team.invites.length)}</span>
                                ) : null}
                                {pendingJoinRequests.length > 0 ? (
                                    <span className="badge badge-accent">{t.teams.manage.joinRequests(pendingJoinRequests.length)}</span>
                                ) : null}
                                {canInvite ? (
                                    <button type="button" className="btn btn-primary btn-sm gap-2" onClick={() => setInviteOpen(true)}>
                                        <UserPlus className="h-4 w-4" />
                                        {t.teams.manage.invitePlayer}
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
                                                    {t.teams.manage.ownerTools}
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
                                    <div className="text-sm font-semibold">{t.teams.manage.joinRequestTitle}</div>
                                    <div className="text-xs text-base-content/60">{t.teams.manage.joinRequestSubtitle}</div>
                                </div>
                                <span className="badge badge-secondary">{t.teams.manage.joinRequestBadge(pendingJoinRequests.length)}</span>
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
                                                {t.teams.manage.accept}
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-outline btn-error btn-xs"
                                                onClick={() => handleJoinRequestDecision(request.id, "reject")}
                                                disabled={isBusy}
                                            >
                                                {t.teams.manage.reject}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    {team.members.length === 0 ? (
                        <div className="rounded-box border border-dashed border-base-300 bg-base-200/40 p-5 text-sm text-base-content/70">
                            {t.teams.manage.emptyRoster}
                        </div>
                    ) : (
                        <>
                            <div className="mt-4 hidden md:block">
                                <div className="overflow-x-auto md:overflow-visible">
                                    <div className="min-w-[720px] overflow-visible md:min-w-0">
                                        <table className="table table-zebra">
                                            <thead>
                                                <tr>
                                                    <th>{t.teams.manage.table.avatar}</th>
                                                    <th>{t.teams.manage.table.username}</th>
                                                    <th>{t.teams.manage.table.role}</th>
                                                    <th>{t.teams.manage.table.joinedAt}</th>
                                                    <th className="text-right">{t.teams.manage.table.actions}</th>
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
                                                        <td>{formatDateLabel(member.joinedAt)}</td>
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
                                                <span>{t.teams.manage.joinedAt(formatDateLabel(member.joinedAt))}</span>
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

            <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title={t.teams.manage.inviteModalTitle} size="md">
                <form className="space-y-5" onSubmit={handleInvite}>
                    <label className="form-control w-full gap-2">
                        <div className="label">
                            <span className="label-text">{t.teams.manage.searchLabel}</span>
                        </div>
                        <input
                            className="input input-bordered w-full"
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder={t.teams.manage.searchPlaceholder}
                        />
                    </label>
                    <label className="form-control w-full gap-2">
                        <div className="label">
                            <span className="label-text">{t.teams.manage.selectLabel}</span>
                        </div>
                        <select
                            className="select select-bordered w-full"
                            value={selectedCandidate}
                            onChange={(event) => setSelectedCandidate(event.target.value)}
                        >
                            {filteredCandidates.length === 0 ? <option value="">{t.teams.manage.noCandidates}</option> : null}
                            {filteredCandidates.map((candidate) => (
                                <option key={candidate.id} value={candidate.id}>
                                    {candidate.fullName} (@{candidate.username})
                                </option>
                            ))}
                        </select>
                    </label>
                    <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                        <button type="button" className="btn btn-outline" onClick={() => setInviteOpen(false)} disabled={isBusy}>
                            {t.common.cancel}
                        </button>
                        <button type="submit" className={`btn btn-primary ${isBusy ? "loading" : ""}`} disabled={isBusy || filteredCandidates.length === 0}>
                            {t.teams.manage.sendInvite}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title={t.teams.manage.ownerTools} size="md">
                {canEdit ? (
                    <form className="space-y-4" onSubmit={handleUpdateTeam}>
                        <label className="block">
                            <span className={labelCls}>{t.teams.manage.nameLabel}</span>
                            <input
                                className={inputCls}
                                value={form.name}
                                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                                placeholder={t.teams.manage.namePlaceholder}
                            />
                        </label>
                        <label className="block">
                            <span className={labelCls}>{t.teams.manage.descriptionLabel}</span>
                            <textarea
                                className={`${inputCls} min-h-[104px] resize-y`}
                                value={form.description}
                                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                                placeholder={t.teams.manage.descriptionPlaceholder}
                            />
                        </label>
                        <div className="space-y-3">
                            <label className={labelCls}>{t.teams.manage.logoUploadLabel}</label>
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
                                        toastError(t.teams.manage.errors.cropLoadFailed);
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
                                        title={t.teams.manage.logoButtonTitle}
                                    >
                                        {logoPreviewUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={logoPreviewUrl} alt={t.teams.manage.logoAlt} className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center text-xl font-black text-primary">
                                                {teamInitials}
                                            </div>
                                        )}
                                        <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/55 via-black/10 to-transparent px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                                            {uploadingLogo ? t.teams.manage.logoProcessing : t.teams.manage.logoChange}
                                        </div>
                                    </button>

                                    {form.logoUrl ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setForm((current) => ({ ...current, logoUrl: "" }));
                                                warning(t.teams.manage.warnings.logoCleared);
                                            }}
                                            disabled={isBusy}
                                            className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border border-base-100 bg-error text-error-content shadow-lg transition-all hover:scale-105 hover:bg-error/85 disabled:cursor-not-allowed disabled:opacity-70"
                                            title={t.teams.manage.logoRemoveTitle}
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
                            {uploadingLogo ? <p className="text-xs text-base-content/45 text-center">{t.teams.manage.logoUploading}</p> : null}
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <button type="submit" className={`btn btn-primary ${isBusy ? "loading" : ""}`} disabled={isBusy}>
                                {isBusy ? t.teams.manage.saving : t.teams.manage.saveChanges}
                            </button>
                            {canDelete ? (
                                <button
                                    type="button"
                                    className="btn btn-outline btn-error"
                                    onClick={() => setDeleteOpen(true)}
                                    disabled={isBusy || team.memberCount > 1}
                                >
                                    {t.teams.manage.deleteTeam}
                                </button>
                            ) : null}
                        </div>
                        {canDelete && team.memberCount > 1 ? (
                            <div className="alert alert-warning">
                                {t.teams.manage.deleteBlocked}
                            </div>
                        ) : null}
                    </form>
                ) : (
                    <div className="alert alert-info">{t.teams.manage.readOnlyNotice}</div>
                )}
            </Modal>

            <ConfirmModal
                open={Boolean(removeTarget)}
                title={t.teams.manage.confirmRemoveTitle}
                message={
                    removeTarget
                        ? t.teams.manage.confirmRemoveMessage(removeTarget.user.fullName)
                        : t.teams.manage.confirmRemoveFallback
                }
                confirmLabel={t.teams.manage.removeMember}
                cancelLabel={t.common.cancel}
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
                title={t.teams.manage.confirmDeleteTitle}
                message={t.teams.manage.confirmDeleteMessage}
                confirmLabel={t.teams.manage.confirmDeleteButton}
                cancelLabel={t.common.cancel}
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
                title={t.teams.manage.cropTitle}
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
