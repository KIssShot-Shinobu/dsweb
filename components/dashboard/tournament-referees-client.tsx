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
import { useLocale } from "@/hooks/use-locale";

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
    const { t } = useLocale();
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
                setErrorMessage(data.message || t.dashboard.referees.errors.loadFailed);
            }
        } catch {
            setStaff([]);
            setErrorMessage(t.dashboard.referees.errors.loadFailed);
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
                setAssignError(data.message || t.dashboard.referees.errors.loadUserFailed);
                setAssignCandidates([]);
                return;
            }
            setAssignCandidates(data.data || []);
        } catch {
            setAssignError(t.dashboard.referees.errors.loadUserFailed);
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
                setAssignError(data.message || t.dashboard.referees.errors.addFailed);
                return;
            }
            setMessage(t.dashboard.referees.success.added);
            await loadStaff();
            await fetchCandidates(assignSearch);
        } catch {
            setAssignError(t.dashboard.referees.errors.addFailed);
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
                setErrorMessage(data.message || t.dashboard.referees.errors.removeFailed);
                return;
            }
            success(t.dashboard.referees.success.removed);
            await loadStaff();
        } catch {
            setErrorMessage(t.dashboard.referees.errors.removeFailed);
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
                    kicker={t.dashboard.referees.kicker}
                    title={t.dashboard.referees.title}
                    description={t.dashboard.referees.description}
                    actions={
                        <button className={btnPrimary} onClick={() => setAssignOpen(true)}>
                            {t.dashboard.referees.add}
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

                <DashboardPanel title={t.dashboard.referees.staffTitle} description={t.dashboard.referees.staffDescription}>
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map((item) => (
                                <div key={item} className="h-20 animate-pulse rounded-box border border-base-300 bg-base-200/40" />
                            ))}
                        </div>
                    ) : staff.length === 0 ? (
                        <DashboardEmptyState
                            title={t.dashboard.referees.emptyTitle}
                            description={t.dashboard.referees.emptyDescription}
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
                                        {t.dashboard.referees.remove}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </DashboardPanel>
            </div>

            <Modal open={assignOpen} onClose={closeAssignModal} title={t.dashboard.referees.modalTitle} size="md">
                <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
                        <div>
                            <label className={labelCls}>{t.dashboard.referees.searchLabel}</label>
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
                                placeholder={t.dashboard.referees.searchPlaceholder}
                                className={inputCls}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>{t.dashboard.referees.roleLabel}</label>
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
                            {t.dashboard.referees.emptyCandidates}
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
                                        {assigningUserId === candidate.id ? t.dashboard.referees.adding : t.dashboard.referees.addAction}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Modal>

            <ConfirmModal
                open={Boolean(removeTarget)}
                title={t.dashboard.referees.confirmTitle}
                message={t.dashboard.referees.confirmMessage(removeTarget?.user.username || removeTarget?.user.fullName || t.dashboard.referees.title)}
                confirmLabel={t.common.delete}
                onConfirm={handleRemove}
                onCancel={() => setRemoveTarget(null)}
            />
        </DashboardPageShell>
    );
}
