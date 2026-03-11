"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/dashboard/modal";
import { useToast } from "@/components/dashboard/toast";
import { btnOutline, btnPrimary, inputCls, labelCls } from "@/components/dashboard/form-styles";
import { normalizeAssetUrl } from "@/lib/asset-url";

type TeamRequest = {
    id: string;
    teamName: string;
    description: string | null;
    logoUrl: string | null;
    status: "PENDING" | "APPROVED" | "REJECTED";
    rejectionReason: string | null;
    createdAt: string;
    reviewedAt: string | null;
    reviewer: { id: string; fullName: string } | null;
};

const emptyForm = {
    name: "",
    description: "",
    logoUrl: "",
};

function formatDate(value: string) {
    return new Date(value).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function getStatusLabel(status: TeamRequest["status"]) {
    if (status === "APPROVED") return "Disetujui";
    if (status === "REJECTED") return "Ditolak";
    return "Menunggu";
}

function getStatusTone(status: TeamRequest["status"]) {
    if (status === "APPROVED") return "badge-success";
    if (status === "REJECTED") return "badge-error";
    return "badge-warning";
}

export function TeamRequestPanel() {
    const [requests, setRequests] = useState<TeamRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [saving, setSaving] = useState(false);
    const { success, error: toastError } = useToast();

    const latestRequest = useMemo(() => requests[0] ?? null, [requests]);
    const hasPending = latestRequest?.status === "PENDING";

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/team-requests?mine=1");
            const data = await res.json();
            if (res.ok) {
                setRequests(data.data || []);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const resetForm = () => {
        setModalOpen(false);
        setForm(emptyForm);
        setUploadingLogo(false);
    };

    const handleLogoUpload = async (file: File) => {
        setUploadingLogo(true);

        try {
            const body = new FormData();
            body.append("file", file);

            const res = await fetch("/api/upload", {
                method: "POST",
                body,
            });
            const data = await res.json();

            if (res.ok && data?.url) {
                setForm((current) => ({ ...current, logoUrl: data.url }));
            } else {
                toastError(data?.message || "Gagal upload logo.");
            }
        } catch {
            toastError("Kesalahan jaringan saat upload logo.");
        } finally {
            setUploadingLogo(false);
        }
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSaving(true);

        try {
            const res = await fetch("/api/team-requests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const data = await res.json();

            if (!res.ok) {
                toastError(data.error || data.message || "Gagal mengirim request.");
                return;
            }

            success("Request team berhasil dikirim. Menunggu persetujuan admin.");
            resetForm();
            await fetchRequests();
        } catch {
            toastError("Kesalahan jaringan saat mengirim request.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="rounded-box border border-base-300 bg-base-200/40 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                        <div className="text-sm font-semibold text-base-content">Belum ada team aktif</div>
                        <p className="text-xs text-base-content/60">
                            Ajukan request pembuatan team ke admin, atau cari team publik untuk join.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => setModalOpen(true)} className={btnPrimary} disabled={hasPending}>
                            {hasPending ? "Menunggu Persetujuan" : "Request Team"}
                        </button>
                        <Link href="/teams" className={btnOutline}>
                            Cari Team
                        </Link>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="h-20 animate-pulse rounded-box border border-base-300 bg-base-200/40" />
            ) : latestRequest ? (
                <div className="rounded-box border border-base-300 bg-base-100 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-semibold text-base-content">{latestRequest.teamName}</div>
                        <span className={`badge ${getStatusTone(latestRequest.status)}`}>{getStatusLabel(latestRequest.status)}</span>
                    </div>
                    <div className="mt-2 text-xs text-base-content/60">
                        Dikirim {formatDate(latestRequest.createdAt)}
                        {latestRequest.reviewedAt ? ` · Diproses ${formatDate(latestRequest.reviewedAt)}` : ""}
                    </div>
                    {latestRequest.rejectionReason ? (
                        <div className="mt-3 rounded-box border border-error/20 bg-error/10 px-3 py-2 text-xs text-error">
                            Alasan: {latestRequest.rejectionReason}
                        </div>
                    ) : null}
                </div>
            ) : null}

            <Modal open={modalOpen} onClose={resetForm} title="Request Pembuatan Team">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <label className="block">
                        <span className={labelCls}>Nama Team</span>
                        <input
                            value={form.name}
                            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                            className={inputCls}
                            placeholder="Contoh: Duel Standby Alpha"
                            required
                        />
                    </label>
                    <label className="block">
                        <span className={labelCls}>Deskripsi (Opsional)</span>
                        <textarea
                            value={form.description}
                            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                            rows={3}
                            className={`${inputCls} resize-none`}
                            placeholder="Ringkas fokus dan gaya bermain team."
                        />
                    </label>
                    <div className="space-y-3">
                        <label className={labelCls}>Upload Logo Team</label>
                        <input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            className={`${inputCls} file:mr-3 file:rounded-xl file:border-0 file:bg-primary/15 file:px-3 file:py-1.5 file:font-semibold file:text-primary`}
                            onChange={async (event) => {
                                const inputEl = event.currentTarget;
                                const file = event.target.files?.[0];
                                if (!file) return;
                                await handleLogoUpload(file);
                                inputEl.value = "";
                            }}
                            disabled={uploadingLogo}
                        />
                        {uploadingLogo ? <p className="text-xs text-base-content/45">Mengupload logo...</p> : null}
                        {form.logoUrl ? (
                            <div className="flex items-center gap-3 rounded-box border border-base-300 bg-base-200/40 p-3">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={normalizeAssetUrl(form.logoUrl) || ""}
                                    alt="Preview logo team"
                                    className="h-16 w-16 rounded-xl object-cover"
                                />
                                <button
                                    type="button"
                                    onClick={() => setForm((current) => ({ ...current, logoUrl: "" }))}
                                    className="text-xs font-medium text-error hover:text-error/80"
                                >
                                    Hapus logo
                                </button>
                            </div>
                        ) : null}
                    </div>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={resetForm} className={btnOutline}>
                            Batal
                        </button>
                        <button type="submit" className={btnPrimary} disabled={saving || uploadingLogo}>
                            {saving ? "Mengirim..." : "Kirim Request"}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
