"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { FormSelect } from "@/components/dashboard/form-select";
import { ConfirmModal } from "@/components/dashboard/confirm-modal";
import { DashboardEmptyState, DashboardPageHeader, DashboardPageShell, DashboardPanel } from "@/components/dashboard/page-shell";
import { btnOutline, btnPrimary, inputCls, labelCls } from "@/components/dashboard/form-styles";
import { Modal } from "@/components/dashboard/modal";
import { normalizeAssetUrl } from "@/lib/asset-url";
import { useToast } from "@/components/dashboard/toast";

type StaffUser = {
    id: string;
    fullName: string;
    username: string | null;
    email: string;
    avatarUrl: string | null;
    role: string;
    status: string;
};

type StaffEntry = {
    id: string;
    role: string;
    createdAt: string;
    user: StaffUser;
};

type CandidateUser = {
    id: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
    role: string;
    status: string;
};

const ROLE_OPTIONS = [
    { value: "REFEREE", label: "Referee" },
    { value: "STAFF", label: "Staff" },
];

function getInitials(name: string) {
    return name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
}

export function TournamentRefereesClient({ tournamentId }: { tournamentId: string }) {
    const { success, error } = useToast();
    const [staff, setStaff] = useState<StaffEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [assignOpen, setAssignOpen] = useState(false);
    const [assignSearch, setAssignSearch] = useState("");
    const [assignRole, setAssignRole] = useState("REFEREE");
    const [assignCandidates, setAssignCandidates] = useState<CandidateUser[]>([]);
    const [assignLoading, setAssignLoading] = useState(false);
    const [assignError, setAssignError] = useState<string | null>(null);
    const [assigningUserId, setAssigningUserId] = useState<string | null>(null);
    const [removeTarget, setRemoveTarget] = useState<StaffEntry | null>(null);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const loadStaff = useCallback(async () => {
        setLoading(true);
        setErrorMessage(null);
        try {
            const res = await fetch(`/api/tournaments/${tournamentId}/staff`);
            const data = await res.json();
            if (res.ok) {
                setStaff(data.staff || []);
            } else {
                setStaff([]);
                setErrorMessage(data.message || "Gagal memuat staff turnamen.");
            }
        } catch {
            setStaff([]);
            setErrorMessage("Gagal memuat staff turnamen.");
        } finally {
            setLoading(false);
        }
    }, [tournamentId]);

    useEffect(() => {
        loadStaff();
    }, [loadStaff]);

    const fetchCandidates = useCallback(async (query: string) => {
        setAssignLoading(true);
        setAssignError(null);
        try {
            const params = new URLSearchParams({
                limit: "8",
            });
            if (query.trim()) params.set("search", query.trim());

            const res = await fetch(`/api/tournaments/${tournamentId}/staff/candidates?${params.toString()}`);
            const data = await res.json();
            if (!res.ok) {
                setAssignError(data.message || "Gagal memuat user.");
                setAssignCandidates([]);
                return;
            }
            setAssignCandidates(data.data || []);
        } catch {
            setAssignError("Gagal memuat user.");
            setAssignCandidates([]);
        } finally {
            setAssignLoading(false);
        }
    }, [tournamentId]);

    useEffect(() => {
        if (!assignOpen) return;
        fetchCandidates(assignSearch);
    }, [assignOpen, assignSearch, fetchCandidates]);

    useEffect(() => () => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    }, []);

    const handleAssign = async (userId: string) => {
        setAssigningUserId(userId);
        setAssignError(null);
        setMessage(null);
        setErrorMessage(null);

        try {
            const res = await fetch(`/api/tournaments/${tournamentId}/staff`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, role: assignRole }),
            });
            const data = await res.json();
            if (!res.ok) {
                setAssignError(data.message || "Gagal menambah referee.");
                return;
            }
            setMessage("Staff turnamen berhasil ditambahkan.");
            await loadStaff();
            await fetchCandidates(assignSearch);
        } catch {
            setAssignError("Gagal menambah referee.");
        } finally {
            setAssigningUserId(null);
        }
    };

    const handleRemove = async () => {
        if (!removeTarget) return;
        setMessage(null);
        setErrorMessage(null);
        try {
            const res = await fetch(`/api/tournaments/${tournamentId}/staff/${removeTarget.id}`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) {
                setErrorMessage(data.message || "Gagal menghapus staff.");
                return;
            }
            success("Staff turnamen dihapus.");
            await loadStaff();
        } catch {
            setErrorMessage("Gagal menghapus staff.");
        } finally {
            setRemoveTarget(null);
        }
    };

    const closeAssignModal = () => {
        setAssignOpen(false);
        setAssignSearch("");
        setAssignRole("REFEREE");
        setAssignCandidates([]);
        setAssignError(null);
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };

    return (
        <DashboardPageShell>
            <div className="space-y-6">
                <DashboardPageHeader
                    kicker="Referee"
                    title="Tournament Referees"
                    description="Atur siapa saja yang bertugas menyelesaikan sengketa pertandingan."
                    actions={
                        <button className={btnPrimary} onClick={() => setAssignOpen(true)}>
                            Tambah Referee
                        </button>
                    }
                />

                {message ? (
                    <div className="rounded-box border border-success/20 bg-success/10 px-4 py-3 text-sm text-success">
                        {message}
                    </div>
                ) : null}

                {errorMessage ? (
                    <div className="rounded-box border border-error/20 bg-error/10 px-4 py-3 text-sm text-error">
                        {errorMessage}
                    </div>
                ) : null}

                <DashboardPanel title="Daftar Referee" description="Referee yang ditugaskan khusus untuk turnamen ini.">
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map((item) => (
                                <div key={item} className="h-20 animate-pulse rounded-box border border-base-300 bg-base-200/40" />
                            ))}
                        </div>
                    ) : staff.length === 0 ? (
                        <DashboardEmptyState
                            title="Belum ada referee"
                            description="Tambahkan referee agar sengketa match dapat ditangani lebih cepat."
                        />
                    ) : (
                        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                            {staff.map((entry) => (
                                <div key={entry.id} className="flex items-center justify-between gap-3 rounded-box border border-base-300 bg-base-200/40 p-4">
                                    <div className="flex min-w-0 items-center gap-3">
                                        {normalizeAssetUrl(entry.user.avatarUrl) ? (
                                            <Image
                                                unoptimized
                                                src={normalizeAssetUrl(entry.user.avatarUrl) || ""}
                                                alt={entry.user.fullName}
                                                width={44}
                                                height={44}
                                                className="h-11 w-11 rounded-2xl border border-base-300 object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-xs font-bold text-primary">
                                                {getInitials(entry.user.fullName)}
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-semibold text-base-content">{entry.user.fullName}</div>
                                            <div className="truncate text-xs text-base-content/60">{entry.user.email}</div>
                                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-base-content/45">
                                                <span className="rounded-full border border-base-300 bg-base-100 px-2 py-0.5">{entry.role}</span>
                                                <span>{entry.user.role}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button className={btnOutline} onClick={() => setRemoveTarget(entry)}>
                                        Hapus
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </DashboardPanel>
            </div>

            <Modal open={assignOpen} onClose={closeAssignModal} title="Tambah Referee" size="md">
                <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
                        <div>
                            <label className={labelCls}>Cari User</label>
                            <input
                                type="text"
                                value={assignSearch}
                                onChange={(event) => {
                                    const nextValue = event.target.value;
                                    setAssignSearch(nextValue);
                                    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
                                    searchTimeoutRef.current = setTimeout(() => {
                                        fetchCandidates(nextValue);
                                    }, 250);
                                }}
                                placeholder="Cari nama atau email..."
                                className={inputCls}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>Role</label>
                            <FormSelect value={assignRole} onChange={setAssignRole} options={ROLE_OPTIONS} />
                        </div>
                    </div>

                    {assignError ? (
                        <div className="rounded-box border border-error/20 bg-error/10 px-3 py-2 text-sm text-error">
                            {assignError}
                        </div>
                    ) : null}

                    {assignLoading ? (
                        <div className="space-y-2">
                            {[1, 2, 3].map((item) => (
                                <div key={item} className="h-16 animate-pulse rounded-box border border-base-300 bg-base-200/50" />
                            ))}
                        </div>
                    ) : assignCandidates.length === 0 ? (
                        <div className="rounded-box border border-dashed border-base-300 bg-base-200/40 px-4 py-6 text-center text-sm text-base-content/60">
                            Tidak ada user aktif yang bisa ditambahkan.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {assignCandidates.map((candidate) => (
                                <div key={candidate.id} className="flex items-center justify-between gap-3 rounded-box border border-base-300 bg-base-200/40 px-3 py-2">
                                    <div className="flex min-w-0 items-center gap-3">
                                        {normalizeAssetUrl(candidate.avatarUrl) ? (
                                            <Image
                                                unoptimized
                                                src={normalizeAssetUrl(candidate.avatarUrl) || ""}
                                                alt={candidate.fullName}
                                                width={40}
                                                height={40}
                                                className="h-10 w-10 rounded-2xl border border-base-300 object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-xs font-bold text-primary">
                                                {getInitials(candidate.fullName)}
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-semibold text-base-content">{candidate.fullName}</div>
                                            <div className="truncate text-xs text-base-content/60">{candidate.email}</div>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleAssign(candidate.id)}
                                        className={btnOutline}
                                        disabled={assigningUserId === candidate.id}
                                    >
                                        {assigningUserId === candidate.id ? "Menambah..." : "Tambah"}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Modal>

            <ConfirmModal
                open={Boolean(removeTarget)}
                title="Hapus Referee"
                message={`Hapus ${removeTarget?.user.fullName || "referee"} dari turnamen ini?`}
                confirmLabel="Hapus"
                onConfirm={handleRemove}
                onCancel={() => setRemoveTarget(null)}
            />
        </DashboardPageShell>
    );
}
