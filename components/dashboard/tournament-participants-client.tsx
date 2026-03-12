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
    user: {
        id: string;
        fullName: string;
        username: string;
        email: string;
        discordId: string | null;
        avatarUrl: string | null;
    };
};

type ParticipantResponse = {
    participants: ParticipantRow[];
    total: number;
    page: number;
    limit: number;
};

const PER_PAGE = 20;

export function TournamentParticipantsClient({ tournamentId }: { tournamentId: string }) {
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
    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

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
        },
        []
    );

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

    const hasData = participants.length > 0;

    return (
        <DashboardPageShell>
            <div className="space-y-6">
                <DashboardPageHeader
                    kicker="Participants"
                    title="Daftar Peserta"
                    description="Kelola data peserta, update in-game name, dan pantau status check-in."
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
                                        <th>Player</th>
                                        <th>In-game Name</th>
                                        <th>Discord ID</th>
                                        <th>Registrasi</th>
                                        <th>Check-in</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {participants.map((participant) => (
                                        <tr key={participant.id}>
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    {normalizeAssetUrl(participant.user.avatarUrl) ? (
                                                        <Image
                                                            unoptimized
                                                            src={normalizeAssetUrl(participant.user.avatarUrl) || ""}
                                                            alt={participant.user.fullName}
                                                            width={36}
                                                            height={36}
                                                            className="h-9 w-9 rounded-full border border-base-300 object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                                                            {getInitials(participant.user.fullName)}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="text-sm font-semibold text-base-content">{participant.user.fullName}</div>
                                                        <div className="text-xs text-base-content/50">@{participant.user.username}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="text-sm text-base-content/70">{participant.gameId}</td>
                                            <td className="text-sm text-base-content/70">{participant.user.discordId || "-"}</td>
                                            <td className="text-sm text-base-content/70">
                                                {new Date(participant.joinedAt).toLocaleDateString("id-ID")}
                                            </td>
                                            <td>
                                                <span className={`badge ${participant.checkedInAt ? "badge-success" : "badge-ghost"}`}>
                                                    {participant.checkedInAt ? "Checked In" : "Belum"}
                                                </span>
                                            </td>
                                            <td className="text-right">
                                                <div className="flex flex-wrap justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline btn-xs"
                                                        onClick={() => toggleCheckIn(participant)}
                                                    >
                                                        {participant.checkedInAt ? "Uncheck" : "Check-in"}
                                                    </button>
                                                    <button type="button" className={`${btnOutline} btn-xs`} onClick={() => openEdit(participant)}>
                                                        Edit
                                                    </button>
                                                    <button type="button" className="btn btn-error btn-outline btn-xs" onClick={() => setConfirmRemove(participant)}>
                                                        Remove
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
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

            <ConfirmModal
                open={Boolean(confirmRemove)}
                title="Hapus peserta?"
                description="Peserta akan dihapus dari turnamen. Aksi ini hanya bisa dilakukan saat turnamen masih OPEN."
                confirmLabel="Hapus"
                onConfirm={handleRemove}
                onClose={() => setConfirmRemove(null)}
            />
        </DashboardPageShell>
    );
}
