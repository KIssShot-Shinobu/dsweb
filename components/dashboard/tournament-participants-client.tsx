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
}: {
    tournamentId: string;
    isTeamTournament?: boolean;
    entryFee?: number;
}) {
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

    const toastSyncInfo = (fallback: string, data?: SyncInfo) => {
        if (typeof data?.syncedCount === "number" && typeof data?.pendingCount === "number") {
            success(`${fallback} ${data.syncedCount} peserta masuk bracket, ${data.pendingCount} menunggu slot kosong.`);
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
                error("Gagal memuat peserta.");
            }
        } catch {
            error("Kesalahan jaringan.");
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
                    error(data.message || "Gagal mencari user.");
                }
            } catch {
                error("Kesalahan jaringan.");
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
                success("Data peserta diperbarui.");
                setEditing(null);
                fetchParticipants();
            } else {
                error(data.message || "Gagal update peserta.");
            }
        } catch {
            error("Kesalahan jaringan.");
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
                success("Peserta dihapus dari turnamen.");
                setConfirmRemove(null);
                fetchParticipants();
            } else {
                error(data.message || "Gagal menghapus peserta.");
            }
        } catch {
            error("Kesalahan jaringan.");
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
                success("Peserta didiskualifikasi.");
                setConfirmDisqualify(null);
                fetchParticipants();
            } else {
                error(data.message || "Gagal mendiskualifikasi peserta.");
            }
        } catch {
            error("Kesalahan jaringan.");
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
                success(participant.checkedInAt ? "Check-in dibatalkan." : "Peserta berhasil check-in.");
                fetchParticipants();
            } else {
                error(data.message || "Gagal memperbarui check-in.");
            }
        } catch {
            error("Kesalahan jaringan.");
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
        if (!selectedUser) {
            error("Pilih user terlebih dahulu.");
            return;
        }
        if (!addUserGameId.trim()) {
            error("In-game name wajib diisi.");
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
                toastSyncInfo("Peserta berhasil ditambahkan.", data);
                resetAddModal();
                fetchParticipants();
            } else {
                error(data.message || "Gagal menambahkan peserta.");
            }
        } catch {
            error("Kesalahan jaringan.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddGuest = async () => {
        if (!guestName.trim()) {
            error("Nama guest wajib diisi.");
            return;
        }
        if (!guestGameId.trim()) {
            error("Game ID wajib diisi.");
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
                toastSyncInfo("Guest berhasil ditambahkan.", data);
                resetAddModal();
                fetchParticipants();
            } else {
                error(data.message || "Gagal menambahkan guest.");
            }
        } catch {
            error("Kesalahan jaringan.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleBulkAdd = async () => {
        if (!bulkText.trim()) {
            error("Data bulk tidak boleh kosong.");
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
                    `Bulk selesai. Added ${data.result.added}, waitlisted ${data.result.waitlisted ?? 0}, skipped ${data.result.skipped}, failed ${data.result.failed.length}.`,
                    data
                );
                setBulkText("");
                setShowBulkModal(false);
                fetchParticipants();
            } else {
                error(data.message || "Gagal bulk add.");
            }
        } catch {
            error("Kesalahan jaringan.");
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
        if (status === "VERIFIED") return "Verified";
        if (status === "REJECTED") return "Rejected";
        return "Pending";
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
                success("Status pembayaran diperbarui.");
                fetchParticipants();
            } else {
                error(data.message || "Gagal memperbarui pembayaran.");
            }
        } catch {
            error("Kesalahan jaringan.");
        }
    };

    const hasData = participants.length > 0;

    return (
        <DashboardPageShell>
            <div className="space-y-6">
                <DashboardPageHeader
                    kicker="Participants"
                    title="Daftar Peserta"
                    description="Kelola data peserta, update in-game name, dan pantau status check-in."
                    actions={
                        isTeamTournament ? (
                            <span className="badge badge-outline">Team Tournament</span>
                        ) : (
                            <>
                                <button className={btnOutline} onClick={() => setShowBulkModal(true)}>
                                    Bulk Add
                                </button>
                                <button className={btnPrimary} onClick={() => setShowAddModal(true)}>
                                    Tambah Peserta
                                </button>
                            </>
                        )
                    }
                />

                <DashboardPanel
                    title="Peserta Terdaftar"
                    description="Gunakan search untuk menemukan peserta tertentu."
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
                            placeholder="Cari peserta..."
                        />
                    }
                >
                    {isTeamTournament ? (
                        <div className="mb-4 rounded-box border border-base-300 bg-base-200/40 px-3 py-3 text-xs text-base-content/60">
                            Turnamen team: pendaftaran hanya lewat registrasi team (captain/vice/manager).
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
                            title="Belum ada peserta"
                            description="Peserta akan muncul setelah registrasi dibuka."
                        />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>{isTeamTournament ? "Team" : "Player"}</th>
                                        <th>{isTeamTournament ? "Team Name" : "In-game Name"}</th>
                                        <th>Discord ID</th>
                                        <th>Registrasi</th>
                                        <th>Check-in</th>
                                        {isPaidTournament ? <th>Payment</th> : null}
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {participants.map((participant) => {
                                        const displayName =
                                            participant.team?.name ||
                                            participant.user?.fullName ||
                                            participant.user?.username ||
                                            participant.guestName ||
                                            "Guest";
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
                                                                <span className="badge badge-outline badge-xs">Guest</span>
                                                            ) : null}
                                                            {participant.team ? <span className="badge badge-outline badge-xs">Team</span> : null}
                                                            {participant.status === "WAITLIST" ? (
                                                                <span className="badge badge-warning badge-xs">Waitlist</span>
                                                            ) : null}
                                                            {participant.status === "DISQUALIFIED" ? (
                                                                <span className="badge badge-error badge-xs">Disqualified</span>
                                                            ) : null}
                                                        </div>
                                                        <div className="text-xs text-base-content/50">
                                                            {participant.team
                                                                ? participant.team.slug
                                                                : participant.user
                                                                  ? `@${participant.user.username}`
                                                                  : "Peserta non-user"}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="text-sm text-base-content/70">
                                                {isTeamTournament ? participant.team?.name || "-" : participant.gameId}
                                            </td>
                                            <td className="text-sm text-base-content/70">{participant.user?.discordId || "-"}</td>
                                            <td className="text-sm text-base-content/70">
                                                {new Date(participant.joinedAt).toLocaleDateString("id-ID")}
                                            </td>
                                            <td>
                                                <span className={`badge ${participant.checkedInAt ? "badge-success" : "badge-ghost"}`}>
                                                    {participant.checkedInAt ? "Checked In" : "Belum"}
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
                                                                {new Date(participant.paymentVerifiedAt).toLocaleString("id-ID")}
                                                            </span>
                                                        ) : null}
                                                        {participant.paymentProofUrl ? (
                                                            <a
                                                                href={normalizeAssetUrl(participant.paymentProofUrl) || "#"}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="btn btn-outline btn-xs"
                                                            >
                                                                Lihat Bukti
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
                                                                    Approve
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-error btn-outline btn-xs"
                                                                    onClick={() => handlePaymentDecision(participant, "REJECTED")}
                                                                >
                                                                    Reject
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
                                                        {participant.checkedInAt ? "Uncheck" : "Check-in"}
                                                    </button>
                                                    {!isTeamTournament ? (
                                                        <button type="button" className={`${btnOutline} btn-xs`} onClick={() => openEdit(participant)}>
                                                            Edit
                                                        </button>
                                                    ) : null}
                                                    <button
                                                        type="button"
                                                        className="btn btn-warning btn-outline btn-xs"
                                                        onClick={() => setConfirmDisqualify(participant)}
                                                        disabled={participant.status === "DISQUALIFIED"}
                                                    >
                                                        Disqualify
                                                    </button>
                                                    <button type="button" className="btn btn-error btn-outline btn-xs" onClick={() => setConfirmRemove(participant)}>
                                                        Remove
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
            <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title="Edit Peserta">
                <div className="space-y-4">
                    <div>
                        <label className={labelCls}>In-game Name / ID</label>
                        <input className={inputCls} value={gameId} onChange={(event) => setGameId(event.target.value)} />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button type="button" className={btnOutline} onClick={() => setEditing(null)}>
                            Batal
                        </button>
                        <button type="button" className={btnPrimary} onClick={handleSave}>
                            Simpan
                        </button>
                    </div>
                </div>
            </Modal>
            ) : null}

            {!isTeamTournament ? (
            <Modal open={showAddModal} onClose={resetAddModal} title="Tambah Peserta" size="lg">
                <div className="space-y-5">
                    <div className="tabs tabs-boxed">
                        <button type="button" className={`tab ${activeTab === "user" ? "tab-active" : ""}`} onClick={() => setActiveTab("user")}>
                            User
                        </button>
                        <button type="button" className={`tab ${activeTab === "guest" ? "tab-active" : ""}`} onClick={() => setActiveTab("guest")}>
                            Guest
                        </button>
                    </div>

                    {activeTab === "user" ? (
                        <div className="space-y-4">
                            <div>
                                <label className={labelCls}>Cari User</label>
                                <input
                                    className={inputCls}
                                    value={candidateQuery}
                                    onChange={(event) => setCandidateQuery(event.target.value)}
                                    placeholder="Cari nama, username, atau email"
                                />
                            </div>
                            <div className="space-y-2">
                                {candidateLoading ? (
                                    <div className="text-xs text-base-content/60">Memuat hasil...</div>
                                ) : candidateQuery.trim().length < 2 ? (
                                    <div className="text-xs text-base-content/50">Masukkan minimal 2 karakter untuk mencari.</div>
                                ) : candidateResults.length === 0 ? (
                                    <div className="text-xs text-base-content/50">Tidak ada hasil.</div>
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
                                                <div className="font-semibold text-base-content">{user.fullName}</div>
                                                <div className="text-xs text-base-content/50">@{user.username} • {user.email}</div>
                                            </div>
                                            {selectedUser?.id === user.id ? <span className="badge badge-primary badge-sm">Dipilih</span> : null}
                                        </button>
                                    ))
                                )}
                            </div>
                            <div>
                                <label className={labelCls}>In-game Name / ID</label>
                                <input
                                    className={inputCls}
                                    value={addUserGameId}
                                    onChange={(event) => setAddUserGameId(event.target.value)}
                                    placeholder="Masukkan IGN / Game ID"
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <button type="button" className={btnOutline} onClick={resetAddModal}>
                                    Batal
                                </button>
                                <button type="button" className={btnPrimary} onClick={handleAddUser} disabled={submitting}>
                                    {submitting ? "Menyimpan..." : "Tambah User"}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className={labelCls}>Nama Guest</label>
                                <input
                                    className={inputCls}
                                    value={guestName}
                                    onChange={(event) => setGuestName(event.target.value)}
                                    placeholder="Nama peserta"
                                />
                            </div>
                            <div>
                                <label className={labelCls}>In-game Name / ID</label>
                                <input
                                    className={inputCls}
                                    value={guestGameId}
                                    onChange={(event) => setGuestGameId(event.target.value)}
                                    placeholder="Masukkan IGN / Game ID"
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <button type="button" className={btnOutline} onClick={resetAddModal}>
                                    Batal
                                </button>
                                <button type="button" className={btnPrimary} onClick={handleAddGuest} disabled={submitting}>
                                    {submitting ? "Menyimpan..." : "Tambah Guest"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
            ) : null}

            {!isTeamTournament ? (
            <Modal open={showBulkModal} onClose={() => setShowBulkModal(false)} title="Bulk Add Peserta" size="lg">
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-base-content/60">
                        <div>Quick fill untuk testing atau seed cepat.</div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                className="btn btn-ghost btn-xs"
                                onClick={() => setBulkText(buildBulkTemplate(32))}
                            >
                                Generate 32
                            </button>
                            <button
                                type="button"
                                className="btn btn-ghost btn-xs"
                                onClick={() => setBulkText("")}
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className={labelCls}>Format (Nama | Game ID)</label>
                        <textarea
                            className={`${inputCls} min-h-[180px] resize-y`}
                            value={bulkText}
                            onChange={(event) => setBulkText(event.target.value)}
                            placeholder={`Contoh:\nAlpha Player | 123-456-789\nBeta Duelist | 987-654-321`}
                        />
                    </div>
                    <div className="text-xs text-base-content/55">
                        Gunakan satu peserta per baris, pisahkan nama dan Game ID dengan tanda |.
                    </div>
                    <div className="flex justify-end gap-2">
                        <button type="button" className={btnOutline} onClick={() => setShowBulkModal(false)}>
                            Batal
                        </button>
                        <button type="button" className={btnPrimary} onClick={handleBulkAdd} disabled={submitting}>
                            {submitting ? "Memproses..." : "Proses Bulk"}
                        </button>
                    </div>
                </div>
            </Modal>
            ) : null}

            <ConfirmModal
                open={Boolean(confirmRemove)}
                title="Hapus peserta?"
                message="Peserta akan dihapus dari turnamen. Aksi ini hanya bisa dilakukan saat turnamen masih OPEN."
                confirmLabel="Hapus"
                onConfirm={handleRemove}
                onCancel={() => setConfirmRemove(null)}
            />
            <ConfirmModal
                open={Boolean(confirmDisqualify)}
                title="Diskualifikasi peserta?"
                message="Peserta akan ditandai sebagai DISQUALIFIED. Match aktif akan di-advance otomatis bila ada lawan."
                confirmLabel={disqualifying ? "Memproses..." : "Disqualify"}
                onConfirm={handleDisqualify}
                onCancel={() => setConfirmDisqualify(null)}
            />
        </DashboardPageShell>
    );
}
