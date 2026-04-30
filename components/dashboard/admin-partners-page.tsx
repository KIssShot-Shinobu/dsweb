"use client";

import { useEffect, useMemo, useState } from "react";
import { normalizeAssetUrl } from "@/lib/asset-url";
import { useLocale } from "@/hooks/use-locale";
import { useToast } from "@/components/dashboard/toast";
import { ConfirmModal } from "@/components/dashboard/confirm-modal";
import { DashboardEmptyState, DashboardPageHeader, DashboardPageShell, DashboardPanel } from "@/components/dashboard/page-shell";
import { btnOutline, btnPrimary, inputCls, labelCls } from "@/components/dashboard/form-styles";

type PartnerCategory = "PARTNER" | "SPONSOR";

type PartnerLogoRow = {
    id: string;
    name: string;
    category: PartnerCategory;
    logoUrl: string;
    websiteUrl: string | null;
    isActive: boolean;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
};

type PartnerFormState = {
    name: string;
    category: PartnerCategory;
    logoUrl: string;
    websiteUrl: string;
    isActive: boolean;
};

const emptyForm = (): PartnerFormState => ({
    name: "",
    category: "PARTNER",
    logoUrl: "",
    websiteUrl: "",
    isActive: true,
});

async function normalizeLogoUploadFile(file: File): Promise<File> {
    if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
        return file;
    }

    const objectUrl = URL.createObjectURL(file);

    try {
        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error("Gagal memproses gambar logo"));
            img.src = objectUrl;
        });

        const sourceCanvas = document.createElement("canvas");
        sourceCanvas.width = image.naturalWidth;
        sourceCanvas.height = image.naturalHeight;
        const sourceCtx = sourceCanvas.getContext("2d");
        if (!sourceCtx) return file;

        sourceCtx.drawImage(image, 0, 0);
        const { data, width, height } = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);

        const cornerIndexes = [
            0,
            (width - 1) * 4,
            (height - 1) * width * 4,
            ((height - 1) * width + (width - 1)) * 4,
        ];
        const bgSample = cornerIndexes.reduce(
            (acc, index) => ({
                r: acc.r + data[index],
                g: acc.g + data[index + 1],
                b: acc.b + data[index + 2],
                a: acc.a + data[index + 3],
            }),
            { r: 0, g: 0, b: 0, a: 0 }
        );

        const background = {
            r: bgSample.r / cornerIndexes.length,
            g: bgSample.g / cornerIndexes.length,
            b: bgSample.b / cornerIndexes.length,
            a: bgSample.a / cornerIndexes.length,
        };

        const colorThreshold = 12;
        const alphaThreshold = 24;
        const transparentBg = background.a <= 20;

        let minX = width;
        let minY = height;
        let maxX = -1;
        let maxY = -1;

        for (let y = 0; y < height; y += 1) {
            for (let x = 0; x < width; x += 1) {
                const index = (y * width + x) * 4;
                const r = data[index];
                const g = data[index + 1];
                const b = data[index + 2];
                const a = data[index + 3];

                const colorDistance = Math.max(
                    Math.abs(r - background.r),
                    Math.abs(g - background.g),
                    Math.abs(b - background.b)
                );
                const alphaDistance = Math.abs(a - background.a);
                const isContent = transparentBg
                    ? a > 20
                    : alphaDistance > alphaThreshold || (a > 20 && colorDistance > colorThreshold);

                if (!isContent) continue;

                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
            }
        }

        if (maxX < minX || maxY < minY) {
            return file;
        }

        const contentWidth = maxX - minX + 1;
        const contentHeight = maxY - minY + 1;
        const padding = Math.max(2, Math.round(Math.max(contentWidth, contentHeight) * 0.06));

        const cropX = Math.max(0, minX - padding);
        const cropY = Math.max(0, minY - padding);
        const cropWidth = Math.min(width - cropX, contentWidth + padding * 2);
        const cropHeight = Math.min(height - cropY, contentHeight + padding * 2);

        const outputCanvas = document.createElement("canvas");
        outputCanvas.width = cropWidth;
        outputCanvas.height = cropHeight;
        const outputCtx = outputCanvas.getContext("2d");
        if (!outputCtx) return file;

        outputCtx.drawImage(sourceCanvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

        const exportMimeType = file.type === "image/webp" ? "image/webp" : file.type === "image/jpeg" || file.type === "image/jpg" ? "image/jpeg" : "image/png";
        const blob = await new Promise<Blob | null>((resolve) => {
            outputCanvas.toBlob(resolve, exportMimeType, exportMimeType === "image/jpeg" ? 0.95 : undefined);
        });

        if (!blob) return file;

        return new File([blob], file.name, {
            type: exportMimeType,
            lastModified: Date.now(),
        });
    } catch {
        return file;
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}

export default function AdminPartnersPage() {
    const { t } = useLocale();
    const { success, error } = useToast();
    const [rows, setRows] = useState<PartnerLogoRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<PartnerLogoRow | null>(null);
    const [form, setForm] = useState<PartnerFormState>(emptyForm);
    const [submitting, setSubmitting] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [reorderingId, setReorderingId] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<PartnerLogoRow | null>(null);

    const loadRows = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/partners", { cache: "no-store" });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.message || t.dashboard.partners.errors.loadFailed);
            }
            setRows(Array.isArray(data?.data) ? data.data : []);
        } catch (err) {
            error(err instanceof Error ? err.message : t.dashboard.partners.errors.loadFailed);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRows();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (editing) {
            setForm({
                name: editing.name,
                category: editing.category,
                logoUrl: editing.logoUrl,
                websiteUrl: editing.websiteUrl ?? "",
                isActive: editing.isActive,
            });
            return;
        }
        setForm(emptyForm());
    }, [editing]);

    const closeModal = () => {
        setModalOpen(false);
        setEditing(null);
        setForm(emptyForm());
    };

    const openCreateModal = () => {
        setEditing(null);
        setForm(emptyForm());
        setModalOpen(true);
    };

    const handleUploadLogo = async (file: File) => {
        setUploadingLogo(true);
        try {
            const body = new FormData();
            body.append("file", file);
            body.append("purpose", "logo");

            const res = await fetch("/api/upload", { method: "POST", body });
            const data = await res.json();
            if (!res.ok || !data?.url) {
                throw new Error(data?.message || t.dashboard.partners.errors.uploadFailed);
            }

            setForm((prev) => ({ ...prev, logoUrl: data.url as string }));
            success(t.dashboard.partners.success.uploaded);
        } catch (err) {
            error(err instanceof Error ? err.message : t.dashboard.partners.errors.uploadFailed);
        } finally {
            setUploadingLogo(false);
        }
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const payload = {
                name: form.name.trim(),
                category: form.category,
                logoUrl: form.logoUrl,
                websiteUrl: form.websiteUrl.trim(),
                isActive: form.isActive,
            };

            const endpoint = editing ? `/api/admin/partners/${editing.id}` : "/api/admin/partners";
            const method = editing ? "PATCH" : "POST";
            const res = await fetch(endpoint, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.message || t.dashboard.partners.errors.saveFailed);
            }

            success(editing ? t.dashboard.partners.success.updated : t.dashboard.partners.success.created);
            closeModal();
            loadRows();
        } catch (err) {
            error(err instanceof Error ? err.message : t.dashboard.partners.errors.saveFailed);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteConfirmed = async () => {
        if (!deleteTarget) return;
        const row = deleteTarget;
        setDeleteTarget(null);
        try {
            const res = await fetch(`/api/admin/partners/${row.id}`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.message || t.dashboard.partners.errors.deleteFailed);
            }
            success(t.dashboard.partners.success.deleted);
            loadRows();
        } catch (err) {
            error(err instanceof Error ? err.message : t.dashboard.partners.errors.deleteFailed);
        }
    };

    const handleToggleActive = async (row: PartnerLogoRow) => {
        try {
            const res = await fetch(`/api/admin/partners/${row.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !row.isActive }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.message || t.dashboard.partners.errors.toggleFailed);
            }
            success(!row.isActive ? t.dashboard.partners.success.activated : t.dashboard.partners.success.deactivated);
            loadRows();
        } catch (err) {
            error(err instanceof Error ? err.message : t.dashboard.partners.errors.toggleFailed);
        }
    };

    const handleReorder = async (row: PartnerLogoRow, direction: "up" | "down") => {
        const categoryRows = rows
            .filter((item) => item.category === row.category)
            .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
        const currentIndex = categoryRows.findIndex((item) => item.id === row.id);
        if (currentIndex === -1) return;

        const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
        const target = categoryRows[targetIndex];
        if (!target) return;

        try {
            setReorderingId(row.id);
            const [firstRes, secondRes] = await Promise.all([
                fetch(`/api/admin/partners/${row.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ sortOrder: target.sortOrder }),
                }),
                fetch(`/api/admin/partners/${target.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ sortOrder: row.sortOrder }),
                }),
            ]);

            const [firstData, secondData] = await Promise.all([firstRes.json(), secondRes.json()]);
            if (!firstRes.ok || !secondRes.ok) {
                throw new Error(firstData?.message || secondData?.message || t.dashboard.partners.errors.reorderFailed);
            }

            success(direction === "up" ? t.dashboard.partners.success.movedUp : t.dashboard.partners.success.movedDown);
            loadRows();
        } catch (err) {
            error(err instanceof Error ? err.message : t.dashboard.partners.errors.reorderFailed);
        } finally {
            setReorderingId(null);
        }
    };

    const canMove = (row: PartnerLogoRow, direction: "up" | "down") => {
        const categoryRows = rows
            .filter((item) => item.category === row.category)
            .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
        const currentIndex = categoryRows.findIndex((item) => item.id === row.id);
        if (currentIndex === -1) return false;
        return direction === "up" ? currentIndex > 0 : currentIndex < categoryRows.length - 1;
    };

    const partnerCount = useMemo(() => rows.filter((item) => item.category === "PARTNER").length, [rows]);
    const sponsorCount = useMemo(() => rows.filter((item) => item.category === "SPONSOR").length, [rows]);

    return (
        <DashboardPageShell>
            <div className="space-y-6">
                <DashboardPageHeader
                    kicker={t.dashboard.partners.kicker}
                    title={t.dashboard.partners.title}
                    description={t.dashboard.partners.description}
                    actions={(
                        <button className={btnPrimary} onClick={openCreateModal}>
                            {t.dashboard.partners.actions.create}
                        </button>
                    )}
                />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-box border border-base-300 bg-base-100 p-4">
                        <div className="text-xs font-bold uppercase tracking-[0.2em] text-base-content/50">{t.dashboard.partners.metrics.total}</div>
                        <div className="mt-1 text-2xl font-black text-base-content">{rows.length}</div>
                    </div>
                    <div className="rounded-box border border-base-300 bg-base-100 p-4">
                        <div className="text-xs font-bold uppercase tracking-[0.2em] text-base-content/50">{t.dashboard.partners.metrics.partners}</div>
                        <div className="mt-1 text-2xl font-black text-primary">{partnerCount}</div>
                    </div>
                    <div className="rounded-box border border-base-300 bg-base-100 p-4">
                        <div className="text-xs font-bold uppercase tracking-[0.2em] text-base-content/50">{t.dashboard.partners.metrics.sponsors}</div>
                        <div className="mt-1 text-2xl font-black text-warning">{sponsorCount}</div>
                    </div>
                </div>

                <DashboardPanel title={t.dashboard.partners.panelTitle} description={t.dashboard.partners.panelDescription(rows.length)}>
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map((item) => (
                                <div key={item} className="h-24 animate-pulse rounded-box border border-base-300 bg-base-200/50" />
                            ))}
                        </div>
                    ) : rows.length === 0 ? (
                        <DashboardEmptyState title={t.dashboard.partners.emptyTitle} description={t.dashboard.partners.emptyDescription} />
                    ) : (
                        <div className="space-y-3">
                            {rows.map((item) => (
                                <div key={item.id} className="flex flex-col gap-4 rounded-box border border-base-300 bg-base-200/40 p-4 lg:flex-row lg:items-center lg:justify-between">
                                    <div className="flex min-w-0 items-center gap-4">
                                        <div className="h-16 w-16 overflow-hidden rounded-box border border-base-300 bg-base-100">
                                            <img src={normalizeAssetUrl(item.logoUrl) || ""} alt={item.name} className="h-full w-full object-contain p-1.5" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-bold text-base-content">{item.name}</div>
                                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-base-content/60">
                                                <span className="rounded-full border border-base-300 bg-base-100 px-2 py-0.5 font-semibold">
                                                    {item.category === "PARTNER" ? t.dashboard.partners.category.partner : t.dashboard.partners.category.sponsor}
                                                </span>
                                                <span>{t.dashboard.partners.labels.order(item.sortOrder)}</span>
                                                {item.websiteUrl ? (
                                                    <a href={item.websiteUrl} target="_blank" rel="noreferrer" className="link link-primary">
                                                        {t.dashboard.partners.labels.website}
                                                    </a>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <div className="flex items-center gap-1">
                                            <button
                                                className="btn btn-outline btn-sm"
                                                onClick={() => handleReorder(item, "up")}
                                                title={t.dashboard.partners.actions.moveUp}
                                                disabled={reorderingId === item.id || !canMove(item, "up")}
                                            >
                                                ^
                                            </button>
                                            <button
                                                className="btn btn-outline btn-sm"
                                                onClick={() => handleReorder(item, "down")}
                                                title={t.dashboard.partners.actions.moveDown}
                                                disabled={reorderingId === item.id || !canMove(item, "down")}
                                            >
                                                v
                                            </button>
                                        </div>
                                        <label className="flex items-center gap-2 text-xs text-base-content/60">
                                            <input
                                                type="checkbox"
                                                className="toggle toggle-primary toggle-sm"
                                                checked={item.isActive}
                                                onChange={() => handleToggleActive(item)}
                                            />
                                            {item.isActive ? t.dashboard.partners.status.active : t.dashboard.partners.status.inactive}
                                        </label>
                                        <button
                                            className={btnOutline}
                                            onClick={() => {
                                                setEditing(item);
                                                setModalOpen(true);
                                            }}
                                        >
                                            {t.dashboard.partners.actions.edit}
                                        </button>
                                        <button className="btn btn-error btn-outline btn-sm" onClick={() => setDeleteTarget(item)}>
                                            {t.dashboard.partners.actions.delete}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </DashboardPanel>
            </div>

            {modalOpen ? (
                <div className="modal modal-open">
                    <div className="modal-box max-w-2xl">
                        <h3 className="text-lg font-bold">{editing ? t.dashboard.partners.modal.editTitle : t.dashboard.partners.modal.createTitle}</h3>
                        <p className="mt-1 text-sm text-base-content/60">{t.dashboard.partners.modal.subtitle}</p>

                        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="md:col-span-2">
                                <label className={labelCls}>{t.dashboard.partners.fields.name}</label>
                                <input
                                    className={inputCls}
                                    value={form.name}
                                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                                    placeholder={t.dashboard.partners.placeholders.name}
                                />
                            </div>

                            <div>
                                    <label className={labelCls}>{t.dashboard.partners.fields.category}</label>
                                    <select
                                    className="select select-bordered w-full bg-base-100"
                                    value={form.category}
                                    onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value as PartnerCategory }))}
                                >
                                    <option value="PARTNER">{t.dashboard.partners.category.partner}</option>
                                    <option value="SPONSOR">{t.dashboard.partners.category.sponsor}</option>
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className={labelCls}>{t.dashboard.partners.fields.logo}</label>
                                <div className="flex flex-wrap items-center gap-2">
                                    <label className="btn btn-outline btn-sm">
                                        {uploadingLogo ? t.dashboard.partners.actions.uploading : t.dashboard.partners.actions.upload}
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                                            onChange={async (event) => {
                                                const inputEl = event.currentTarget;
                                                const file = inputEl.files?.[0];
                                                if (file) {
                                                    const processedFile = await normalizeLogoUploadFile(file);
                                                    await handleUploadLogo(processedFile);
                                                }
                                                inputEl.value = "";
                                            }}
                                        />
                                    </label>
                                    {form.logoUrl ? (
                                        <button
                                            className="btn btn-ghost btn-sm text-error"
                                            onClick={() => setForm((prev) => ({ ...prev, logoUrl: "" }))}
                                        >
                                            {t.dashboard.partners.actions.removeLogo}
                                        </button>
                                    ) : null}
                                </div>
                                {form.logoUrl ? (
                                    <div className="mt-2 h-24 w-40 overflow-hidden rounded-box border border-base-300 bg-base-100">
                                        <img src={normalizeAssetUrl(form.logoUrl) || ""} alt={form.name || "logo preview"} className="h-full w-full object-contain p-2" />
                                    </div>
                                ) : (
                                    <p className="mt-2 text-xs text-base-content/55">{t.dashboard.partners.hints.logo}</p>
                                )}
                            </div>

                            <div className="md:col-span-2">
                                <label className={labelCls}>{t.dashboard.partners.fields.website}</label>
                                <input
                                    className={inputCls}
                                    value={form.websiteUrl}
                                    onChange={(event) => setForm((prev) => ({ ...prev, websiteUrl: event.target.value }))}
                                    placeholder={t.dashboard.partners.placeholders.website}
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="flex items-center justify-between rounded-box border border-base-300 bg-base-200/40 px-3 py-3 text-sm font-semibold text-base-content">
                                    {t.dashboard.partners.fields.isActive}
                                    <input
                                        type="checkbox"
                                        className="toggle toggle-primary"
                                        checked={form.isActive}
                                        onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                                    />
                                </label>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-2">
                            <button className={btnOutline} onClick={closeModal}>
                                {t.common.cancel}
                            </button>
                            <button className={btnPrimary} onClick={handleSubmit} disabled={submitting || uploadingLogo}>
                                {submitting ? t.common.saving : t.common.save}
                            </button>
                        </div>
                    </div>
                    <div className="modal-backdrop" onClick={closeModal} />
                </div>
            ) : null}

            <ConfirmModal
                open={Boolean(deleteTarget)}
                title={t.dashboard.partners.actions.delete}
                message={deleteTarget ? t.dashboard.partners.confirmDelete(deleteTarget.name) : ""}
                confirmLabel={t.dashboard.partners.actions.delete}
                cancelLabel={t.common.cancel}
                danger
                onConfirm={handleDeleteConfirmed}
                onClose={() => setDeleteTarget(null)}
            />
        </DashboardPageShell>
    );
}
