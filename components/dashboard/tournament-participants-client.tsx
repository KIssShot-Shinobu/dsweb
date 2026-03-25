"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Pagination } from "@/components/dashboard/pagination";
import { Modal } from "@/components/dashboard/modal";
import { ConfirmModal } from "@/components/dashboard/confirm-modal";
import { DashboardEmptyState, DashboardPageHeader, DashboardPageShell, DashboardPanel } from "@/components/dashboard/page-shell";
import { btnOutline, btnPrimary, inputCls, labelCls, searchInputCls } from "@/components/dashboard/form-styles";
import { useToast } from "@/components/dashboard/toast";
import { normalizeAssetUrl } from "@/lib/asset-url";
import { useLocale } from "@/hooks/use-locale";
import { formatDate, formatDateTime } from "@/lib/i18n/format";

function getInitials(name: string) {
    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("") || "-";
}

type ParticipantRow = {
    id: string;
    gameId: string;
    joinedAt: string;
    checkedInAt: string | null;
    status: "REGISTERED" | "CHECKED_IN" | "DISQUALIFIED" | "PLAYING" | "WAITLIST";
    paymentStatus: "PENDING" | "VERIFIED" | "REJECTED";
    paymentProofUrl: string | null;
    paymentVerifiedAt: string | null;
    guestName: string | null;
    team: {
        id: string;
        name: string;
        slug: string;
        logoUrl: string | null;
    } | null;
    user: {
        id: string;
        fullName: string;
        username: string;
        email: string;
        discordId: string | null;
        avatarUrl: string | null;
    } | null;
};

type ParticipantResponse = {
    participants: ParticipantRow[];
    total: number;
    page: number;
    limit: number;
};

type SyncInfo = {
    syncedCount?: number;
    pendingCount?: number;
};

const PER_PAGE = 20;

type CandidateUser = {
    id: string;
    fullName: string;
    username: string;
    email: string;
    avatarUrl: string | null;
};

export function TournamentParticipantsClient({
    tournamentId,
    isTeamTournament = false,
    entryFee = 0,
    tournamentStatus = "OPEN",
}: {
    tournamentId: string;
    isTeamTournament?: boolean;
    entryFee?: number;
    tournamentStatus?: string;
}) {
    const { locale, t } = useLocale();
    const { success, error } = useToast();
    const [participants, setParticipants] = useState<ParticipantRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [editing, setEditing] = useState<ParticipantRow | null>(null);
    const [gameId, setGameId] = useState("");
    const [confirmRemove, setConfirmRemove] = useState<ParticipantRow | null>(null);
    const [confirmDisqualify, setConfirmDisqualify] = useState<ParticipantRow | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [activeTab, setActiveTab] = useState<"user" | "guest">("user");
    const [candidateQuery, setCandidateQuery] = useState("");
    const [candidateResults, setCandidateResults] = useState<CandidateUser[]>([]);
    const [candidateLoading, setCandidateLoading] = useState(false);
    const [selectedUser, setSelectedUser] = useState<CandidateUser | null>(null);
    const [addUserGameId, setAddUserGameId] = useState("");
    const [guestName, setGuestName] = useState("");
    const [guestGameId, setGuestGameId] = useState("");
    const [bulkText, setBulkText] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [disqualifying, setDisqualifying] = useState(false);
    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const candidateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
    const isPaidTournament = entryFee > 0;
    const rosterLocked = tournamentStatus === "ONGOING";

    const toastSyncInfo = (fallback: string, data?: SyncInfo) => {
        if (typeof data?.syncedCount === "number" && typeof data?.pendingCount === "number") {
            success(t.dashboard.participants.syncToast(data.syncedCount, data.pendingCount, fallback));
            return;
        }
        success(fallback);
    };

    const fetchParticipants = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(page),
                limit: String(PER_PAGE),
            });
            if (search.trim()) params.set("search", search.trim());
            const res = await fetch(`/api/tournaments/${tournamentId}/participants?${params.toString()}`);
            const data = (await res.json()) as { success: boolean } & ParticipantResponse;
            if (res.ok) {
                setParticipants(data.participants);
                setTotal(data.total);
            } else {
                error(t.dashboard.participants.errors.loadFailed);
            }
        } catch {
            error(t.dashboard.participants.errors.network);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchParticipants();
    }, [page, search]);

    useEffect(
        () => () => {
            if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
            if (candidateTimerRef.current) clearTimeout(candidateTimerRef.current);
        },
        []
    );

    useEffect(() => {
        if (candidateQuery.trim().length < 2) {
            setCandidateResults([]);
            return;
        }

        if (candidateTimerRef.current) clearTimeout(candidateTimerRef.current);
        candidateTimerRef.current = setTimeout(async () => {
            try {
                setCandidateLoading(true);
                const params = new URLSearchParams({ search: candidateQuery.trim() });
                const res = await fetch(`/api/tournaments/${tournamentId}/participants/candidates?${params.toString()}`);
                const data = await res.json();
                if (res.ok) {
                    setCandidateResults(data.users || []);
                } else {
                    error(data.message || t.dashboard.participants.errors.searchUserFailed);
                }
            } catch {
                error(t.dashboard.participants.errors.network);
            } finally {
                setCandidateLoading(false);
            }
        }, 250);
    }, [candidateQuery, tournamentId, error]);

    const openEdit = (participant: ParticipantRow) => {
        setEditing(participant);
        setGameId(participant.gameId);
    };

    const handleSave = async () => {
        if (!editing) return;
        try {
            const res = await fetch(`/api/tournaments/${tournamentId}/participants/${editing.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ gameId }),
            });
            const data = await res.json();
            if (res.ok) {
                success(t.dashboard.participants.success.updated);
                setEditing(null);
                fetchParticipants();
            } else {
                error(data.message || t.dashboard.participants.errors.updateFailed);
            }
        } catch {
            error(t.dashboard.participants.errors.network);
        }
    };

    const handleRemove = async () => {
        if (!confirmRemove) return;
        try {
            const res = await fetch(`/api/tournaments/${tournamentId}/participants/${confirmRemove.id}`, {
                method: "DELETE",
            });
            const data = await res.json();
            if (res.ok) {
                success(t.dashboard.participants.success.removed);
                setConfirmRemove(null);
                fetchParticipants();
            } else {
                error(data.message || t.dashboard.participants.errors.removeFailed);
            }
        } catch {
            error(t.dashboard.participants.errors.network);
        }
    };

    const handleDisqualify = async () => {
        if (!confirmDisqualify || disqualifying) return;
        setDisqualifying(true);
        try {
            const res = await fetch(`/api/tournaments/${tournamentId}/participants/${confirmDisqualify.id}/disqualify`, {
                method: "POST",
            });
            const data = await res.json();
            if (res.ok) {
                success(t.dashboard.participants.success.disqualified);
                setConfirmDisqualify(null);
                fetchParticipants();
            } else {
                error(data.message || t.dashboard.participants.errors.disqualifyFailed);
            }
        } catch {
            error(t.dashboard.participants.errors.network);
        } finally {
            setDisqualifying(false);
        }
    };

    const toggleCheckIn = async (participant: ParticipantRow) => {
        try {
            const res = await fetch(`/api/tournaments/${tournamentId}/participants/${participant.id}/check-in`, {
                method: "POST",
            });
            const data = await res.json();
            if (res.ok) {
                success(participant.checkedInAt ? t.dashboard.participants.success.checkInRemoved : t.dashboard.participants.success.checkInAdded);
                fetchParticipants();
            } else {
                error(data.message || t.dashboard.participants.errors.checkinFailed);
            }
        } catch {
            error(t.dashboard.participants.errors.network);
        }
    };

    const resetAddModal = () => {
        setShowAddModal(false);
        setSelectedUser(null);
        setCandidateQuery("");
        setCandidateResults([]);
        setAddUserGameId("");
        setGuestName("");
        setGuestGameId("");
        setActiveTab("user");
    };

    const handleAddUser = async () => {
        if (rosterLocked) {
            error(t.dashboard.participants.errors.rosterLocked);
            return;
        }
        if (!selectedUser) {
            error(t.dashboard.participants.errors.selectUser);
            return;
        }
        if (!addUserGameId.trim()) {
            error(t.dashboard.participants.errors.gameIdRequired);
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch(`/api/tournaments/${tournamentId}/participants`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: selectedUser.id, gameId: addUserGameId }),
            });
            const data = await res.json();
            if (res.ok) {
                toastSyncInfo(t.dashboard.participants.success.added, data);
                resetAddModal();
                fetchParticipants();
            } else {
                error(data.message || t.dashboard.participants.errors.addFailed);
            }
        } catch {
            error(t.dashboard.participants.errors.network);
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddGuest = async () => {
        if (rosterLocked) {
            error(t.dashboard.participants.errors.rosterLocked);
            return;
        }
        if (!guestName.trim()) {
            error(t.dashboard.participants.errors.guestNameRequired);
            return;
        }
        if (!guestGameId.trim()) {
            error(t.dashboard.participants.errors.guestGameIdRequired);
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch(`/api/tournaments/${tournamentId}/participants`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ guestName: guestName.trim(), gameId: guestGameId.trim() }),
            });
            const data = await res.json();
            if (res.ok) {
                toastSyncInfo(t.dashboard.participants.success.guestAdded, data);
                resetAddModal();
                fetchParticipants();
            } else {
                error(data.message || t.dashboard.participants.errors.addGuestFailed);
            }
        } catch {
            error(t.dashboard.participants.errors.network);
        } finally {
            setSubmitting(false);
        }
    };

    const handleBulkAdd = async () => {
        if (rosterLocked) {
            error(t.dashboard.participants.errors.rosterLocked);
            return;
        }
        if (!bulkText.trim()) {
            error(t.dashboard.participants.errors.bulkEmpty);
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch(`/api/tournaments/${tournamentId}/participants/bulk`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: bulkText }),
            });
            const data = await res.json();
            if (res.ok) {
                toastSyncInfo(
                    t.dashboard.participants.bulkToast(
                        data.result.added,
                        data.result.waitlisted ?? 0,
                        data.result.skipped,
                        data.result.failed.length
                    ),
                    data
                );
                setBulkText("");
                setShowBulkModal(false);
                fetchParticipants();
            } else {
                error(data.message || t.dashboard.participants.errors.bulkFailed);
            }
        } catch {
            error(t.dashboard.participants.errors.network);
        } finally {
            setSubmitting(false);
        }
    };

    const buildBulkTemplate = (count: number) => {
        const lines = Array.from({ length: count }, (_, index) => {
            const number = String(index + 1).padStart(2, "0");
            return `Player ${number} | IGN${number}`;
        });
        return lines.join("\n");
    };

    const renderPaymentBadge = (status: ParticipantRow["paymentStatus"]) => {
        if (status === "VERIFIED") return "badge-success";
        if (status === "REJECTED") return "badge-error";
        return "badge-warning";
    };

    const renderPaymentLabel = (status: ParticipantRow["paymentStatus"]) => {
        if (status === "VERIFIED") return t.dashboard.participants.status.paymentVerified;
        if (status === "REJECTED") return t.dashboard.participants.status.paymentRejected;
        return t.dashboard.participants.status.paymentPending;
    };

    const handlePaymentDecision = async (participant: ParticipantRow, status: "VERIFIED" | "REJECTED") => {
        try {
            const res = await fetch(`/api/tournaments/${tournamentId}/participants/${participant.id}/payment`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });
            const data = await res.json();
            if (res.ok) {
                success(t.dashboard.participants.success.paymentUpdated);
                fetchParticipants();
            } else {
                error(data.message || t.dashboard.participants.errors.paymentUpdateFailed);
            }
        } catch {
            error(t.dashboard.participants.errors.network);
        }
    };

    const hasData = participants.length > 0;

    return (
        <DashboardPageShell>
            <div className="space-y-6">
                <DashboardPageHeader
                    kicker={t.dashboard.participants.kicker}
                    title={t.dashboard.participants.title}
                    description={t.dashboard.participants.description}
                    actions={
                        isTeamTournament ? (
                            <span className="badge badge-outline">{t.dashboard.participants.teamTournamentBadge}</span>
                        ) : (
                            <>
                                <button className={btnOutline} onClick={() => setShowBulkModal(true)} disabled={rosterLocked}>
                                    {t.dashboard.participants.bulkAdd}
                                </button>
                                <button className={btnPrimary} onClick={() => setShowAddModal(true)} disabled={rosterLocked}>
                                    {t.dashboard.participants.addParticipant}
                                </button>
                            </>
                        )
                    }
                />
                {rosterLocked ? (
                    <div className="alert alert-warning">
                        <span>{t.dashboard.participants.rosterLockedNotice}</span>
                    </div>
                ) : null}

                <DashboardPanel
                    title={t.dashboard.participants.panelTitle}
                    description={t.dashboard.participants.panelDescription}
                    action={
                        <input
                            type="text"
                            className={`${searchInputCls} h-9 sm:w-52`}
                            value={searchInput}
                            onChange={(event) => {
                                const nextValue = event.target.value;
                                setSearchInput(nextValue);
                                if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
                                searchTimerRef.current = setTimeout(() => {
                                    setPage(1);
                                    setSearch(nextValue);
                                }, 250);
                            }}
                            placeholder={t.dashboard.participants.searchPlaceholder}
                        />
                    }
                >
                    {isTeamTournament ? (
                        <div className="mb-4 rounded-box border border-base-300 bg-base-200/40 px-3 py-3 text-xs text-base-content/60">
                            {t.dashboard.participants.teamTournamentNote}
                        </div>
                    ) : null}
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map((row) => (
                                <div key={row} className="h-16 animate-pulse rounded-box border border-base-300 bg-base-200/40" />
                            ))}
                        </div>
                    ) : !hasData ? (
                        <DashboardEmptyState
                            title={t.dashboard.participants.emptyTitle}
                            description={t.dashboard.participants.emptyDescription}
                        />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>{isTeamTournament ? t.dashboard.participants.table.team : t.dashboard.participants.table.player}</th>
                                        <th>{isTeamTournament ? t.dashboard.participants.table.teamName : t.dashboard.participants.table.ign}</th>
                                        <th>{t.dashboard.participants.table.discordId}</th>
                                        <th>{t.dashboard.participants.table.registeredAt}</th>
                                        <th>{t.dashboard.participants.table.checkIn}</th>
                                        {isPaidTournament ? <th>{t.dashboard.participants.table.payment}</th> : null}
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {participants.map((participant) => {
                                        const displayName =
                                            participant.team?.name ||
                                            participant.user?.username ||
                                            participant.user?.fullName ||
                                            participant.guestName ||
                                            t.dashboard.participants.labels.guest;
                                        const avatarUrl = normalizeAssetUrl(participant.team?.logoUrl || participant.user?.avatarUrl || "");

                                        return (
                                        <tr key={participant.id}>
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    {avatarUrl ? (
                                                        <Image
                                                            unoptimized
                                                            src={avatarUrl}
                                                            alt={displayName}
                                                            width={36}
                                                            height={36}
                                                            className="h-9 w-9 rounded-full border border-base-300 object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                                                            {getInitials(displayName)}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <div className="text-sm font-semibold text-base-content">
                                                                {displayName}
                                                            </div>
                                                            {!participant.user && !participant.team ? (
                                                                <span className="badge badge-outline badge-xs">{t.dashboard.participants.badges.guest}</span>
                                                            ) : null}
                                                            {participant.team ? <span className="badge badge-outline badge-xs">{t.dashboard.participants.badges.team}</span> : null}
                                                            {participant.status === "WAITLIST" ? (
                                                                <span className="badge badge-warning badge-xs">{t.dashboard.participants.badges.waitlist}</span>
                                                            ) : null}
                                                            {participant.status === "DISQUALIFIED" ? (
                                                                <span className="badge badge-error badge-xs">{t.dashboard.participants.badges.disqualified}</span>
                                                            ) : null}
                                                        </div>
                                                        <div className="text-xs text-base-content/50">
                                                            {participant.team
                                                                ? participant.team.slug
                                                                : participant.user
                                                                  ? `@${participant.user.username}`
                                                                  : t.dashboard.participants.labels.nonUser}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="text-sm text-base-content/70">
                                                {isTeamTournament ? participant.team?.name || "-" : participant.gameId}
                                            </td>
                                            <td className="text-sm text-base-content/70">{participant.user?.discordId || "-"}</td>
                                            <td className="text-sm text-base-content/70">
                                                {formatDate(participant.joinedAt, locale)}
                                            </td>
                                            <td>
                                                <span className={`badge ${participant.checkedInAt ? "badge-success" : "badge-ghost"}`}>
                                                    {participant.checkedInAt ? t.dashboard.participants.status.checkedIn : t.dashboard.participants.status.notCheckedIn}
                                                </span>
                                            </td>
                                            {isPaidTournament ? (
                                                <td>
                                                    <div className="flex flex-col gap-2">
                                                        <span className={`badge ${renderPaymentBadge(participant.paymentStatus)}`}>
                                                            {renderPaymentLabel(participant.paymentStatus)}
                                                        </span>
                                                        {participant.paymentStatus === "VERIFIED" && participant.paymentVerifiedAt ? (
                                                            <span className="text-[11px] text-base-content/55">
                                                                {formatDateTime(participant.paymentVerifiedAt, locale)}
                                                            </span>
                                                        ) : null}
                                                        {participant.paymentProofUrl ? (
                                                            <a
                                                                href={normalizeAssetUrl(participant.paymentProofUrl) || "#"}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="btn btn-outline btn-xs"
                                                            >
                                                                {t.dashboard.participants.actions.viewProof}
                                                            </a>
                                                        ) : (
                                                            <span className="text-xs text-base-content/50">-</span>
                                                        )}
                                                        {participant.paymentStatus !== "VERIFIED" ? (
                                                            <div className="flex flex-wrap gap-2">
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-success btn-outline btn-xs"
                                                                    onClick={() => handlePaymentDecision(participant, "VERIFIED")}
                                                                >
                                                                    {t.dashboard.participants.actions.approve}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-error btn-outline btn-xs"
                                                                    onClick={() => handlePaymentDecision(participant, "REJECTED")}
                                                                >
                                                                    {t.dashboard.participants.actions.reject}
                                                                </button>
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                </td>
                                            ) : null}
                                            <td className="text-right">
                                                <div className="flex flex-wrap justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline btn-xs"
                                                        onClick={() => toggleCheckIn(participant)}
                                                        disabled={participant.status === "WAITLIST" || participant.status === "DISQUALIFIED"}
                                                    >
                                                        {participant.checkedInAt ? t.dashboard.participants.actions.uncheck : t.dashboard.participants.actions.checkIn}
                                                    </button>
                                                    {!isTeamTournament ? (
                                                        <button type="button" className={`${btnOutline} btn-xs`} onClick={() => openEdit(participant)}>
                                                            {t.dashboard.participants.actions.edit}
                                                        </button>
                                                    ) : null}
                                                    <button
                                                        type="button"
                                                        className="btn btn-warning btn-outline btn-xs"
                                                        onClick={() => setConfirmDisqualify(participant)}
                                                        disabled={participant.status === "DISQUALIFIED"}
                                                    >
                                                        {t.dashboard.participants.actions.disqualify}
                                                    </button>
                                                    <button type="button" className="btn btn-error btn-outline btn-xs" onClick={() => setConfirmRemove(participant)}>
                                                        {t.dashboard.participants.actions.remove}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {hasData ? (
                        <div className="mt-4">
                            <Pagination page={page} totalPages={totalPages} total={total} perPage={PER_PAGE} onPage={setPage} />
                        </div>
                    ) : null}
                </DashboardPanel>
            </div>

            {!isTeamTournament ? (
            <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={t.dashboard.participants.modals.editTitle}>
                <div className="space-y-4">
                    <div>
                        <label className={labelCls}>{t.dashboard.participants.modals.editLabel}</label>
                        <input className={inputCls} value={gameId} onChange={(event) => setGameId(event.target.value)} />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button type="button" className={btnOutline} onClick={() => setEditing(null)}>
                            {t.common.cancel}
                        </button>
                        <button type="button" className={btnPrimary} onClick={handleSave}>
                            {t.dashboard.participants.modals.save}
                        </button>
                    </div>
                </div>
            </Modal>
            ) : null}

            {!isTeamTournament ? (
            <Modal open={showAddModal} onClose={resetAddModal} title={t.dashboard.participants.modals.addTitle} size="lg">
                <div className="space-y-5">
                    <div className="tabs tabs-boxed">
                        <button type="button" className={`tab ${activeTab === "user" ? "tab-active" : ""}`} onClick={() => setActiveTab("user")}>
                            {t.dashboard.participants.modals.userTab}
                        </button>
                        <button type="button" className={`tab ${activeTab === "guest" ? "tab-active" : ""}`} onClick={() => setActiveTab("guest")}>
                            {t.dashboard.participants.modals.guestTab}
                        </button>
                    </div>

                    {activeTab === "user" ? (
                        <div className="space-y-4">
                            <div>
                                <label className={labelCls}>{t.dashboard.participants.modals.searchUserLabel}</label>
                                <input
                                    className={inputCls}
                                    value={candidateQuery}
                                    onChange={(event) => setCandidateQuery(event.target.value)}
                                    placeholder={t.dashboard.participants.modals.searchUserPlaceholder}
                                />
                            </div>
                            <div className="space-y-2">
                                {candidateLoading ? (
                                    <div className="text-xs text-base-content/60">{t.dashboard.participants.modals.searchLoading}</div>
                                ) : candidateQuery.trim().length < 2 ? (
                                    <div className="text-xs text-base-content/50">{t.dashboard.participants.modals.searchHint}</div>
                                ) : candidateResults.length === 0 ? (
                                    <div className="text-xs text-base-content/50">{t.dashboard.participants.modals.searchEmpty}</div>
                                ) : (
                                    candidateResults.map((user) => (
                                        <button
                                            key={user.id}
                                            type="button"
                                            className={`flex w-full items-center justify-between rounded-box border px-3 py-2 text-left text-sm transition ${
                                                selectedUser?.id === user.id ? "border-primary bg-primary/10" : "border-base-300 bg-base-200/40 hover:border-primary/40"
                                            }`}
                                            onClick={() => setSelectedUser(user)}
                                        >
                                            <div>
                                                <div className="font-semibold text-base-content">{user.username || user.fullName}</div>
                                                <div className="text-xs text-base-content/50">
                                                    {user.fullName && user.fullName !== user.username ? `${user.fullName} · ` : ""}
                                                    {user.email}
                                                </div>
                                            </div>
                                            {selectedUser?.id === user.id ? <span className="badge badge-primary badge-sm">{t.dashboard.participants.modals.selected}</span> : null}
                                        </button>
                                    ))
                                )}
                            </div>
                            <div>
                                <label className={labelCls}>{t.dashboard.participants.modals.addUserGameIdLabel}</label>
                                <input
                                    className={inputCls}
                                    value={addUserGameId}
                                    onChange={(event) => setAddUserGameId(event.target.value)}
                                    placeholder={t.dashboard.participants.modals.addUserGameIdPlaceholder}
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <button type="button" className={btnOutline} onClick={resetAddModal}>
                                    {t.common.cancel}
                                </button>
                                <button type="button" className={btnPrimary} onClick={handleAddUser} disabled={submitting}>
                                    {submitting ? t.dashboard.participants.modals.saving : t.dashboard.participants.modals.addUser}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className={labelCls}>{t.dashboard.participants.modals.addGuestNameLabel}</label>
                                <input
                                    className={inputCls}
                                    value={guestName}
                                    onChange={(event) => setGuestName(event.target.value)}
                                    placeholder={t.dashboard.participants.modals.addGuestNamePlaceholder}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>{t.dashboard.participants.modals.addGuestGameIdLabel}</label>
                                <input
                                    className={inputCls}
                                    value={guestGameId}
                                    onChange={(event) => setGuestGameId(event.target.value)}
                                    placeholder={t.dashboard.participants.modals.addGuestGameIdPlaceholder}
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <button type="button" className={btnOutline} onClick={resetAddModal}>
                                    {t.common.cancel}
                                </button>
                                <button type="button" className={btnPrimary} onClick={handleAddGuest} disabled={submitting}>
                                    {submitting ? t.dashboard.participants.modals.saving : t.dashboard.participants.modals.addGuest}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
            ) : null}

            {!isTeamTournament ? (
            <Modal open={showBulkModal} onClose={() => setShowBulkModal(false)} title={t.dashboard.participants.modals.bulkTitle} size="lg">
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-base-content/60">
                        <div>{t.dashboard.participants.modals.bulkQuickFill}</div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                className="btn btn-ghost btn-xs"
                                onClick={() => setBulkText(buildBulkTemplate(32))}
                            >
                                {t.dashboard.participants.modals.bulkGenerate}
                            </button>
                            <button
                                type="button"
                                className="btn btn-ghost btn-xs"
                                onClick={() => setBulkText("")}
                            >
                                {t.dashboard.participants.modals.bulkClear}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className={labelCls}>{t.dashboard.participants.modals.bulkFormatLabel}</label>
                        <textarea
                            className={`${inputCls} min-h-[180px] resize-y`}
                            value={bulkText}
                            onChange={(event) => setBulkText(event.target.value)}
                            placeholder={t.dashboard.participants.modals.bulkPlaceholder}
                        />
                    </div>
                    <div className="text-xs text-base-content/55">
                        {t.dashboard.participants.modals.bulkHint}
                    </div>
                    <div className="flex justify-end gap-2">
                        <button type="button" className={btnOutline} onClick={() => setShowBulkModal(false)}>
                            {t.common.cancel}
                        </button>
                        <button type="button" className={btnPrimary} onClick={handleBulkAdd} disabled={submitting}>
                            {submitting ? t.dashboard.participants.modals.bulkProcessing : t.dashboard.participants.modals.bulkProcess}
                        </button>
                    </div>
                </div>
            </Modal>
            ) : null}

            <ConfirmModal
                open={Boolean(confirmRemove)}
                title={t.dashboard.participants.confirmRemoveTitle}
                message={t.dashboard.participants.confirmRemoveMessage}
                confirmLabel={t.common.delete}
                onConfirm={handleRemove}
                onCancel={() => setConfirmRemove(null)}
            />
            <ConfirmModal
                open={Boolean(confirmDisqualify)}
                title={t.dashboard.participants.confirmDisqualifyTitle}
                message={t.dashboard.participants.confirmDisqualifyMessage}
                confirmLabel={disqualifying ? t.dashboard.participants.disqualifyProcessing : t.dashboard.participants.actions.disqualify}
                onConfirm={handleDisqualify}
                onCancel={() => setConfirmDisqualify(null)}
            />
        </DashboardPageShell>
    );
}
