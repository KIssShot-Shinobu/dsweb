"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/dashboard/modal";
import { useToast } from "@/components/dashboard/toast";
import { btnOutline, btnPrimary, inputCls, labelCls } from "@/components/dashboard/form-styles";
import { normalizeAssetUrl } from "@/lib/asset-url";
import { ImageCropModal } from "@/components/ui/image-crop-modal";
import { useLocale } from "@/hooks/use-locale";
import { formatDate } from "@/lib/i18n/format";

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

function getStatusLabel(status: TeamRequest["status"]) {
    if (status === "APPROVED") return "APPROVED";
    if (status === "REJECTED") return "REJECTED";
    return "PENDING";
}

function getStatusTone(status: TeamRequest["status"]) {
    if (status === "APPROVED") return "badge-success";
    if (status === "REJECTED") return "badge-error";
    return "badge-warning";
}

export function TeamRequestPanel() {
    const { t, locale } = useLocale();
    const [requests, setRequests] = useState<TeamRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [saving, setSaving] = useState(false);
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
    const { success, error: toastError } = useToast();
    const formatDateLabel = (value: string) =>
        formatDate(value, locale, { day: "numeric", month: "short", year: "numeric" });

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
                toastError(data?.message || t.teams.request.errors.uploadFailed);
            }
        } catch {
            toastError(t.teams.request.errors.uploadNetworkFailed);
        } finally {
            setUploadingLogo(false);
        }
    };

    const readFileAsDataUrl = (file: File) =>
        new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(new Error(t.teams.request.errors.readFileFailed));
            reader.readAsDataURL(file);
        });

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
                toastError(data.error || data.message || t.teams.request.errors.submitFailed);
                return;
            }

            success(t.teams.request.success.submitted);
            resetForm();
            await fetchRequests();
        } catch {
            toastError(t.teams.request.errors.submitNetworkFailed);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="rounded-box border border-base-300 bg-base-200/40 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                        <div className="text-sm font-semibold text-base-content">{t.teams.request.emptyTitle}</div>
                        <p className="text-xs text-base-content/60">{t.teams.request.emptySubtitle}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => setModalOpen(true)} className={btnPrimary} disabled={hasPending}>
                            {hasPending ? t.teams.request.requestPending : t.teams.request.requestButton}
                        </button>
                        <Link href="/teams" className={btnOutline}>
                            {t.teams.request.browseTeams}
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
                        <span className={`badge ${getStatusTone(latestRequest.status)}`}>
                            {t.teams.request.status[getStatusLabel(latestRequest.status)]}
                        </span>
                    </div>
                    <div className="mt-2 text-xs text-base-content/60">
                        {t.teams.request.submittedAt(formatDateLabel(latestRequest.createdAt))}
                        {latestRequest.reviewedAt ? ` · ${t.teams.request.reviewedAt(formatDateLabel(latestRequest.reviewedAt))}` : ""}
                    </div>
                    {latestRequest.rejectionReason ? (
                        <div className="mt-3 rounded-box border border-error/20 bg-error/10 px-3 py-2 text-xs text-error">
                            {t.teams.request.rejectionReason(latestRequest.rejectionReason)}
                        </div>
                    ) : null}
                </div>
            ) : null}

            <Modal open={modalOpen} onClose={resetForm} title={t.teams.request.modalTitle}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <label className="block">
                        <span className={labelCls}>{t.teams.request.nameLabel}</span>
                        <input
                            value={form.name}
                            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                            className={inputCls}
                            placeholder={t.teams.request.namePlaceholder}
                            required
                        />
                    </label>
                    <label className="block">
                        <span className={labelCls}>{t.teams.request.descriptionLabel}</span>
                        <textarea
                            value={form.description}
                            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                            rows={3}
                            className={`${inputCls} resize-none`}
                            placeholder={t.teams.request.descriptionPlaceholder}
                        />
                    </label>
                    <div className="space-y-3">
                        <label className={labelCls}>{t.teams.request.logoUploadLabel}</label>
                        <input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            className={`${inputCls} file:mr-3 file:rounded-xl file:border-0 file:bg-primary/15 file:px-3 file:py-1.5 file:font-semibold file:text-primary`}
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
                                    toastError(t.teams.request.errors.loadCropFailed);
                                }
                                inputEl.value = "";
                            }}
                            disabled={uploadingLogo}
                        />
                        {uploadingLogo ? <p className="text-xs text-base-content/45">{t.teams.request.logoUploading}</p> : null}
                        {form.logoUrl ? (
                            <div className="flex items-center gap-3 rounded-box border border-base-300 bg-base-200/40 p-3">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={normalizeAssetUrl(form.logoUrl) || ""}
                                    alt={t.teams.request.logoPreviewAlt}
                                    className="h-16 w-16 rounded-xl object-cover"
                                />
                                <button
                                    type="button"
                                    onClick={() => setForm((current) => ({ ...current, logoUrl: "" }))}
                                    className="text-xs font-medium text-error hover:text-error/80"
                                >
                                    {t.teams.request.removeLogo}
                                </button>
                            </div>
                        ) : null}
                    </div>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={resetForm} className={btnOutline}>
                            {t.common.cancel}
                        </button>
                        <button type="submit" className={btnPrimary} disabled={saving || uploadingLogo}>
                            {saving ? t.teams.request.submitting : t.teams.request.submit}
                        </button>
                    </div>
                </form>
            </Modal>

            <ImageCropModal
                open={cropState.open}
                imageSrc={cropState.imageSrc}
                title={t.teams.request.cropTitle}
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
