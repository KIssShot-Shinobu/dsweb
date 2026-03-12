"use client";

import { useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { FormSelect } from "@/components/dashboard/form-select";
import { btnPrimary, inputCls, labelCls } from "@/components/dashboard/form-styles";
import { normalizeAssetUrl } from "@/lib/asset-url";

export const tournamentFormSelectOptions = {
    gameType: [
        { value: "DUEL_LINKS", label: "Duel Links" },
        { value: "MASTER_DUEL", label: "Master Duel" },
    ],
    format: [
        { value: "BO1", label: "Best of 1" },
        { value: "BO3", label: "Best of 3" },
        { value: "BO5", label: "Best of 5" },
    ],
    structure: [
        { value: "SINGLE_ELIM", label: "Single Elimination" },
        { value: "DOUBLE_ELIM", label: "Double Elimination (Soon)" },
        { value: "SWISS", label: "Swiss (Soon)" },
    ],
    visibility: [
        { value: "PUBLIC", label: "Public" },
        { value: "PRIVATE", label: "Private" },
        { value: "UNLISTED", label: "Unlisted" },
    ],
    maxPlayers: [
        { value: "8", label: "8 pemain" },
        { value: "16", label: "16 pemain" },
        { value: "32", label: "32 pemain" },
        { value: "64", label: "64 pemain" },
        { value: "128", label: "128 pemain" },
        { value: "256", label: "256 pemain" },
    ],
    status: [
        { value: "OPEN", label: "OPEN" },
        { value: "ONGOING", label: "ONGOING" },
        { value: "COMPLETED", label: "COMPLETED" },
        { value: "CANCELLED", label: "CANCELLED" },
    ],
};

const DEFAULT_MAX_PLAYERS = "32";
const formatIdrInput = (value: number) => new Intl.NumberFormat("id-ID").format(value);
const parseIdrInput = (value: string) => {
    const numeric = Number(value.replace(/[^0-9]/g, ""));
    return Number.isNaN(numeric) ? 0 : numeric;
};

export type TournamentFormState = ReturnType<typeof getDefaultTournamentForm>;

export function getDefaultTournamentForm() {
    return {
        title: "",
        description: "",
        gameType: "DUEL_LINKS",
        format: "BO3",
        status: "OPEN",
        structure: "SINGLE_ELIM",
        entryFee: 0,
        prizePool: 0,
        startDate: "",
        image: "",
        onlineMode: "ONLINE",
        checkInEnabled: true,
        longDescription: "",
        visibility: "PUBLIC",
        privacyPassword: "",
        streamUrl: "",
        matchGuideImage: "",
        organizerDiscord: "",
        organizerTwitter: "",
        organizerEmail: "",
        organizerWebsite: "",
        bannerImage: "",
        backgroundImage: "",
        themeColor: "#6366f1",
        thirdPlaceMatch: false,
        groupStageEnabled: false,
        groupCount: 2,
        playersPerGroup: 8,
        maxPlayers: DEFAULT_MAX_PLAYERS,
        participationRules: "",
        registrationStart: "",
        registrationEnd: "",
        lateCancelDeadline: "",
        entryDisplayName: "Nama In-Game",
        customFields: [] as string[],
        publishNow: true,
        allowEditUntilStart: true,
    };
}

export function buildTournamentPayload(formData: TournamentFormState) {
    return {
        title: formData.title,
        description: formData.longDescription || formData.description,
        gameType: formData.gameType,
        format: formData.format,
        structure: formData.structure,
        status: formData.status,
        entryFee: formData.entryFee,
        prizePool: formData.prizePool,
        startDate: formData.startDate,
        image: formData.image,
    };
}

function FormSection({
    title,
    description,
    children,
}: {
    title: string;
    description?: string;
    children: ReactNode;
}) {
    return (
        <div className="card border border-base-300 bg-base-100/90 shadow-sm">
            <div className="card-body space-y-4">
                <div>
                    <h3 className="text-base font-bold text-base-content">{title}</h3>
                    {description ? <p className="text-xs text-base-content/60">{description}</p> : null}
                </div>
                {children}
            </div>
        </div>
    );
}

export function TournamentForm({
    formData,
    setFormData,
    uploadingImage,
    submitting,
    onUploadImage,
    onSubmit,
    submitLabel,
    showStatus = false,
}: {
    formData: TournamentFormState;
    setFormData: Dispatch<SetStateAction<TournamentFormState>>;
    uploadingImage: boolean;
    submitting: boolean;
    onUploadImage: (file: File) => Promise<string | null>;
    onSubmit: (payload: TournamentFormState) => Promise<void>;
    submitLabel: string;
    showStatus?: boolean;
}) {
    const [confirmPublishOpen, setConfirmPublishOpen] = useState(false);
    const [pendingSubmit, setPendingSubmit] = useState(false);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (formData.publishNow && !confirmPublishOpen && !pendingSubmit) {
            setPendingSubmit(true);
            setConfirmPublishOpen(true);
            return;
        }
        await onSubmit(formData);
        setPendingSubmit(false);
    };

    const handleConfirmPublish = async () => {
        setConfirmPublishOpen(false);
        await onSubmit(formData);
        setPendingSubmit(false);
    };

    const handleUploadAsset = async (file: File, key: keyof TournamentFormState) => {
        const url = await onUploadImage(file);
        if (!url) return;
        setFormData((prev) => ({ ...prev, [key]: url }));
    };

    const updateCustomField = (index: number, value: string) => {
        setFormData((prev) => ({
            ...prev,
            customFields: prev.customFields.map((field, idx) => (idx === index ? value : field)),
        }));
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <FormSection title="Event Summary" description="Data inti turnamen yang akan muncul di kartu publik.">
                    <div className="space-y-4">
                        <div>
                            <label className={labelCls}>Cover Image</label>
                            <input
                                type="file"
                                accept="image/png,image/jpeg,image/jpg,image/webp"
                                className={`${inputCls} file:mr-3 file:rounded-xl file:border-0 file:bg-primary/15 file:px-3 file:py-1.5 file:font-semibold file:text-primary`}
                                onChange={async (e) => {
                                    const inputEl = e.currentTarget;
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const url = await onUploadImage(file);
                                    if (url) {
                                        setFormData((prev) => ({ ...prev, image: url }));
                                    }
                                    inputEl.value = "";
                                }}
                                disabled={uploadingImage}
                            />
                            {uploadingImage ? <p className="mt-2 text-xs text-base-content/45">Mengupload gambar...</p> : null}
                        </div>
                        {formData.image ? (
                            <div className="rounded-box border border-base-300 bg-base-200/40 p-2">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={normalizeAssetUrl(formData.image) || ""} alt="Preview tournament" className="h-44 w-full rounded-xl object-cover" />
                                <button type="button" onClick={() => setFormData((prev) => ({ ...prev, image: "" }))} className="mt-3 text-xs font-medium text-error hover:text-error/80">
                                    Hapus gambar
                                </button>
                            </div>
                        ) : null}
                        <div>
                            <label className={labelCls}>Tournament Name</label>
                            <input type="text" className={inputCls} required value={formData.title} onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))} />
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <label className={labelCls}>Game Selection</label>
                                <FormSelect value={formData.gameType} onChange={(value) => setFormData((prev) => ({ ...prev, gameType: value }))} options={tournamentFormSelectOptions.gameType} />
                            </div>
                            <div>
                                <label className={labelCls}>Start Time</label>
                                <input type="datetime-local" className={inputCls} required value={formData.startDate} onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))} />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="rounded-box border border-base-300 bg-base-200/40 px-3 py-3">
                                <label className="flex items-center justify-between text-sm font-semibold text-base-content">
                                    Online Mode
                                    <input
                                        type="checkbox"
                                        className="toggle toggle-primary"
                                        checked={formData.onlineMode === "ONLINE"}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, onlineMode: e.target.checked ? "ONLINE" : "OFFLINE" }))}
                                    />
                                </label>
                                <p className="mt-2 text-xs text-base-content/55">Aktifkan untuk event yang berjalan secara online.</p>
                            </div>
                            <div className="rounded-box border border-base-300 bg-base-200/40 px-3 py-3">
                                <label className="flex items-center justify-between text-sm font-semibold text-base-content">
                                    Check-in Enabled
                                    <input
                                        type="checkbox"
                                        className="toggle toggle-primary"
                                        checked={formData.checkInEnabled}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, checkInEnabled: e.target.checked }))}
                                    />
                                </label>
                                <p className="mt-2 text-xs text-base-content/55">Gunakan check-in sebelum bracket dimulai.</p>
                            </div>
                        </div>
                    </div>
                </FormSection>
                <FormSection title="Event Details" description="Deskripsi lengkap. Markdown diperbolehkan.">
                    <textarea
                        className={`${inputCls} min-h-[220px] resize-y`}
                        value={formData.longDescription}
                        onChange={(e) => setFormData((prev) => ({ ...prev, longDescription: e.target.value }))}
                        placeholder="Tuliskan detail event, rules singkat, format pertandingan, dan info penting lainnya."
                    />
                    <p className="mt-2 text-xs text-base-content/45">Gunakan Markdown untuk heading, list, dan highlight.</p>
                </FormSection>

                <FormSection title="Privacy Settings" description="Atur visibilitas dan akses turnamen.">
                    <div className="space-y-3">
                        <FormSelect
                            value={formData.visibility}
                            onChange={(value) => setFormData((prev) => ({ ...prev, visibility: value }))}
                            options={tournamentFormSelectOptions.visibility}
                        />
                        <div>
                            <label className={labelCls}>Password (opsional)</label>
                            <input
                                type="text"
                                className={inputCls}
                                value={formData.privacyPassword}
                                onChange={(e) => setFormData((prev) => ({ ...prev, privacyPassword: e.target.value }))}
                                placeholder="Hanya untuk turnamen private/unlisted."
                            />
                        </div>
                    </div>
                </FormSection>
                <FormSection title="Media & Broadcast" description="Link stream dan screenshot contoh untuk peserta.">
                    <div className="space-y-4">
                        <div>
                            <label className={labelCls}>Stream URL</label>
                            <input
                                type="url"
                                className={inputCls}
                                value={formData.streamUrl}
                                onChange={(e) => setFormData((prev) => ({ ...prev, streamUrl: e.target.value }))}
                                placeholder="https://youtube.com/..."
                            />
                        </div>
                        <div>
                            <label className={labelCls}>Match Screenshot Guide</label>
                            <input
                                type="file"
                                accept="image/png,image/jpeg,image/jpg,image/webp"
                                className={`${inputCls} file:mr-3 file:rounded-xl file:border-0 file:bg-primary/15 file:px-3 file:py-1.5 file:font-semibold file:text-primary`}
                                onChange={async (e) => {
                                    const inputEl = e.currentTarget;
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    await handleUploadAsset(file, "matchGuideImage");
                                    inputEl.value = "";
                                }}
                            />
                            {formData.matchGuideImage ? (
                                <div className="mt-3 rounded-box border border-base-300 bg-base-200/40 p-2">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={normalizeAssetUrl(formData.matchGuideImage) || ""}
                                        alt="Preview match guide"
                                        className="h-32 w-full rounded-xl object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setFormData((prev) => ({ ...prev, matchGuideImage: "" }))}
                                        className="mt-2 text-xs font-medium text-error hover:text-error/80"
                                    >
                                        Hapus gambar
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </FormSection>

                <FormSection title="Contact Information" description="Kontak resmi penyelenggara.">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                            <label className={labelCls}>Discord</label>
                            <input className={inputCls} value={formData.organizerDiscord} onChange={(e) => setFormData((prev) => ({ ...prev, organizerDiscord: e.target.value }))} placeholder="discord.gg/..." />
                        </div>
                        <div>
                            <label className={labelCls}>Twitter / X</label>
                            <input className={inputCls} value={formData.organizerTwitter} onChange={(e) => setFormData((prev) => ({ ...prev, organizerTwitter: e.target.value }))} placeholder="@duelstandby" />
                        </div>
                        <div>
                            <label className={labelCls}>Email</label>
                            <input className={inputCls} value={formData.organizerEmail} onChange={(e) => setFormData((prev) => ({ ...prev, organizerEmail: e.target.value }))} placeholder="admin@duelstandby.com" />
                        </div>
                        <div>
                            <label className={labelCls}>Website</label>
                            <input className={inputCls} value={formData.organizerWebsite} onChange={(e) => setFormData((prev) => ({ ...prev, organizerWebsite: e.target.value }))} placeholder="https://duelstandby.com" />
                        </div>
                    </div>
                </FormSection>
                <FormSection title="Visual Customization" description="Atur identitas visual turnamen.">
                    <div className="space-y-4">
                        <div>
                            <label className={labelCls}>Banner Image</label>
                            <input
                                type="file"
                                accept="image/png,image/jpeg,image/jpg,image/webp"
                                className={`${inputCls} file:mr-3 file:rounded-xl file:border-0 file:bg-primary/15 file:px-3 file:py-1.5 file:font-semibold file:text-primary`}
                                onChange={async (e) => {
                                    const inputEl = e.currentTarget;
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    await handleUploadAsset(file, "bannerImage");
                                    inputEl.value = "";
                                }}
                            />
                            {formData.bannerImage ? (
                                <div className="mt-3 rounded-box border border-base-300 bg-base-200/40 p-2">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={normalizeAssetUrl(formData.bannerImage) || ""}
                                        alt="Preview banner"
                                        className="h-32 w-full rounded-xl object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setFormData((prev) => ({ ...prev, bannerImage: "" }))}
                                        className="mt-2 text-xs font-medium text-error hover:text-error/80"
                                    >
                                        Hapus gambar
                                    </button>
                                </div>
                            ) : null}
                        </div>
                        <div>
                            <label className={labelCls}>Event Color Theme</label>
                            <input
                                type="color"
                                className="h-11 w-full rounded-box border border-base-300 bg-base-100 px-2"
                                value={formData.themeColor}
                                onChange={(e) => setFormData((prev) => ({ ...prev, themeColor: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>Background Image (opsional)</label>
                            <input
                                type="file"
                                accept="image/png,image/jpeg,image/jpg,image/webp"
                                className={`${inputCls} file:mr-3 file:rounded-xl file:border-0 file:bg-primary/15 file:px-3 file:py-1.5 file:font-semibold file:text-primary`}
                                onChange={async (e) => {
                                    const inputEl = e.currentTarget;
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    await handleUploadAsset(file, "backgroundImage");
                                    inputEl.value = "";
                                }}
                            />
                            {formData.backgroundImage ? (
                                <div className="mt-3 rounded-box border border-base-300 bg-base-200/40 p-2">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={normalizeAssetUrl(formData.backgroundImage) || ""}
                                        alt="Preview background"
                                        className="h-32 w-full rounded-xl object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setFormData((prev) => ({ ...prev, backgroundImage: "" }))}
                                        className="mt-2 text-xs font-medium text-error hover:text-error/80"
                                    >
                                        Hapus gambar
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </FormSection>

                <FormSection title="Tournament Structure" description="Format bracket dan pengaturan stage.">
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <label className={labelCls}>Tournament Format</label>
                                <FormSelect value={formData.structure} onChange={(value) => setFormData((prev) => ({ ...prev, structure: value }))} options={tournamentFormSelectOptions.structure} />
                            </div>
                            <div>
                                <label className={labelCls}>Match Format</label>
                                <FormSelect value={formData.format} onChange={(value) => setFormData((prev) => ({ ...prev, format: value }))} options={tournamentFormSelectOptions.format} />
                            </div>
                        </div>
                        <label className="flex items-center justify-between rounded-box border border-base-300 bg-base-200/40 px-3 py-3 text-sm font-semibold text-base-content">
                            Third Place Match
                            <input type="checkbox" className="toggle toggle-primary" checked={formData.thirdPlaceMatch} onChange={(e) => setFormData((prev) => ({ ...prev, thirdPlaceMatch: e.target.checked }))} />
                        </label>
                        <label className="flex items-center justify-between rounded-box border border-base-300 bg-base-200/40 px-3 py-3 text-sm font-semibold text-base-content">
                            Block / Group Stage
                            <input type="checkbox" className="toggle toggle-primary" checked={formData.groupStageEnabled} onChange={(e) => setFormData((prev) => ({ ...prev, groupStageEnabled: e.target.checked }))} />
                        </label>
                        {formData.groupStageEnabled ? (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div>
                                    <label className={labelCls}>Number of Groups</label>
                                    <input type="number" className={inputCls} min={2} value={formData.groupCount} onChange={(e) => setFormData((prev) => ({ ...prev, groupCount: Number(e.target.value) }))} />
                                </div>
                                <div>
                                    <label className={labelCls}>Players per Group</label>
                                    <input type="number" className={inputCls} min={4} value={formData.playersPerGroup} onChange={(e) => setFormData((prev) => ({ ...prev, playersPerGroup: Number(e.target.value) }))} />
                                </div>
                            </div>
                        ) : null}
                    </div>
                </FormSection>
                <FormSection title="Participant Settings" description="Atur kapasitas dan biaya partisipasi.">
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <label className={labelCls}>Maximum Players</label>
                                <FormSelect value={formData.maxPlayers} onChange={(value) => setFormData((prev) => ({ ...prev, maxPlayers: value }))} options={tournamentFormSelectOptions.maxPlayers} />
                                <p className="mt-2 text-xs text-base-content/45">Maximum players harus sesuai ukuran bracket.</p>
                            </div>
                            <div>
                                <label className={labelCls}>Entry Fee (Rp)</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    className={inputCls}
                                    value={formData.entryFee ? formatIdrInput(formData.entryFee) : ""}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, entryFee: parseIdrInput(e.target.value) }))}
                                    placeholder="0"
                                />
                            </div>
                        </div>
                        <div>
                            <label className={labelCls}>Prize Pool (Rp)</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                className={inputCls}
                                value={formData.prizePool ? formatIdrInput(formData.prizePool) : ""}
                                onChange={(e) => setFormData((prev) => ({ ...prev, prizePool: parseIdrInput(e.target.value) }))}
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className={labelCls}>Participation Rules</label>
                            <textarea className={`${inputCls} min-h-[120px] resize-y`} value={formData.participationRules} onChange={(e) => setFormData((prev) => ({ ...prev, participationRules: e.target.value }))} placeholder="Contoh: minimal rank, deck list, atau persyaratan lain." />
                        </div>
                    </div>
                </FormSection>

                <FormSection title="Entry Period" description="Atur periode registrasi dan batas pembatalan.">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                            <label className={labelCls}>Registration Start</label>
                            <input type="datetime-local" className={inputCls} value={formData.registrationStart} onChange={(e) => setFormData((prev) => ({ ...prev, registrationStart: e.target.value }))} />
                        </div>
                        <div>
                            <label className={labelCls}>Registration End</label>
                            <input type="datetime-local" className={inputCls} value={formData.registrationEnd} onChange={(e) => setFormData((prev) => ({ ...prev, registrationEnd: e.target.value }))} />
                        </div>
                        <div className="sm:col-span-2">
                            <label className={labelCls}>Late Cancellation Deadline</label>
                            <input type="datetime-local" className={inputCls} value={formData.lateCancelDeadline} onChange={(e) => setFormData((prev) => ({ ...prev, lateCancelDeadline: e.target.value }))} />
                        </div>
                    </div>
                </FormSection>
                <FormSection title="Entry Form Customization" description="Atur field tambahan untuk peserta.">
                    <div className="space-y-4">
                        <div>
                            <label className={labelCls}>Entry Display Name</label>
                            <input className={inputCls} value={formData.entryDisplayName} onChange={(e) => setFormData((prev) => ({ ...prev, entryDisplayName: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className={labelCls}>Custom Participant Fields</label>
                                <button
                                    type="button"
                                    className="btn btn-outline btn-xs"
                                    onClick={() => setFormData((prev) => ({ ...prev, customFields: [...prev.customFields, ""] }))}
                                >
                                    + Tambah Field
                                </button>
                            </div>
                            {formData.customFields.length === 0 ? (
                                <div className="rounded-box border border-dashed border-base-300 bg-base-200/40 px-3 py-4 text-xs text-base-content/50">
                                    Belum ada field tambahan.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {formData.customFields.map((field, index) => (
                                        <div key={`${field}-${index}`} className="flex items-center gap-2">
                                            <input
                                                className={inputCls}
                                                value={field}
                                                onChange={(e) => updateCustomField(index, e.target.value)}
                                                placeholder="Contoh: Discord ID"
                                            />
                                            <button
                                                type="button"
                                                className="btn btn-ghost btn-xs text-error"
                                                onClick={() =>
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        customFields: prev.customFields.filter((_, idx) => idx !== index),
                                                    }))
                                                }
                                            >
                                                Hapus
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </FormSection>

                <FormSection title="Publish Settings" description="Kontrol akhir sebelum turnamen ditayangkan.">
                    <div className="space-y-3">
                        {showStatus ? (
                            <div>
                                <label className={labelCls}>Status</label>
                                <FormSelect value={formData.status} onChange={(value) => setFormData((prev) => ({ ...prev, status: value }))} options={tournamentFormSelectOptions.status} />
                            </div>
                        ) : null}
                        <label className="flex items-center justify-between rounded-box border border-base-300 bg-base-200/40 px-3 py-3 text-sm font-semibold text-base-content">
                            Publish Now
                            <input type="checkbox" className="toggle toggle-primary" checked={formData.publishNow} onChange={(e) => setFormData((prev) => ({ ...prev, publishNow: e.target.checked }))} />
                        </label>
                        <label className="flex items-center justify-between rounded-box border border-base-300 bg-base-200/40 px-3 py-3 text-sm font-semibold text-base-content">
                            Allow Editing Until Start
                            <input type="checkbox" className="toggle toggle-primary" checked={formData.allowEditUntilStart} onChange={(e) => setFormData((prev) => ({ ...prev, allowEditUntilStart: e.target.checked }))} />
                        </label>
                        <div className="rounded-box border border-base-300 bg-base-200/40 px-3 py-3 text-xs text-base-content/55">
                            Preview halaman turnamen untuk memastikan semua informasi sudah rapi sebelum publikasi.
                        </div>
                    </div>
                </FormSection>
            </div>
            <div className="flex justify-end gap-3">
                <button type="submit" disabled={submitting} className={btnPrimary}>
                    {submitting ? "Menyimpan..." : submitLabel}
                </button>
            </div>
            {confirmPublishOpen ? (
                <div className="modal modal-open">
                    <div className="modal-box max-w-md">
                        <h3 className="text-lg font-bold">Publish turnamen sekarang?</h3>
                        <p className="mt-2 text-sm text-base-content/60">
                            Pastikan informasi event sudah benar. Setelah publish, peserta bisa langsung melihat detail turnamen.
                        </p>
                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={() => {
                                    setConfirmPublishOpen(false);
                                    setPendingSubmit(false);
                                }}
                            >
                                Batal
                            </button>
                            <button type="button" className={btnPrimary} onClick={handleConfirmPublish}>
                                Ya, Publish
                            </button>
                        </div>
                    </div>
                    <div className="modal-backdrop" />
                </div>
            ) : null}
        </form>
    );
}
