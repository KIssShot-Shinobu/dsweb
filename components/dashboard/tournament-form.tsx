"use client";

import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { FormSelect } from "@/components/dashboard/form-select";
import { btnPrimary, inputCls, labelCls } from "@/components/dashboard/form-styles";
import { normalizeAssetUrl } from "@/lib/asset-url";
import { ImageCropModal } from "@/components/ui/image-crop-modal";
import { DateTimePickerInput } from "@/components/ui/date-time-picker";
import { DEFAULT_TIMEZONE, getTimeZoneOptions } from "@/lib/timezones";
import { useLocale } from "@/hooks/use-locale";
import { getIntlLocale } from "@/lib/i18n/format";
import { useGames } from "@/hooks/use-games";

const DEFAULT_MAX_PLAYERS = "32";
const parseIdrInput = (value: string) => {
    const numeric = Number(value.replace(/[^0-9]/g, ""));
    return Number.isNaN(numeric) ? 0 : numeric;
};

export type TournamentFormState = ReturnType<typeof getDefaultTournamentForm>;

export function getDefaultTournamentForm() {
    return {
        title: "",
        description: "",
        gameType: "",
        format: "BO3",
        status: "OPEN",
        structure: "SINGLE_ELIM",
        mode: "INDIVIDUAL",
        isTeamTournament: false,
        timezone: DEFAULT_TIMEZONE,
        entryFee: 0,
        prizePool: 0,
        startAt: "",
        image: "",
        onlineMode: "ONLINE",
        checkInEnabled: true,
        forfeitEnabled: false,
        forfeitGraceMinutes: 15,
        forfeitMode: "CHECKIN_ONLY",
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
        lineupSize: "",
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
        mode: formData.isTeamTournament ? formData.mode : "INDIVIDUAL",
        isTeamTournament: formData.isTeamTournament,
        status: formData.status,
        timezone: formData.timezone,
        entryFee: formData.entryFee,
        prizePool: formData.prizePool,
        maxPlayers: formData.maxPlayers ? Number(formData.maxPlayers) : undefined,
        registrationOpen: formData.registrationStart || undefined,
        registrationClose: formData.registrationEnd || undefined,
        checkinRequired: formData.checkInEnabled,
        forfeitEnabled: formData.forfeitEnabled,
        forfeitGraceMinutes: formData.forfeitGraceMinutes,
        forfeitMode: formData.forfeitMode,
        lineupSize: formData.isTeamTournament ? (formData.lineupSize ? Number(formData.lineupSize) : null) : null,
        startAt: formData.startAt,
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
    const { t, locale } = useLocale();
    const { games, loading: gamesLoading } = useGames();
    const [confirmPublishOpen, setConfirmPublishOpen] = useState(false);
    const [pendingSubmit, setPendingSubmit] = useState(false);
    const timeZoneOptions = useMemo(() => getTimeZoneOptions(), []);
    const [cropState, setCropState] = useState<{
        open: boolean;
        imageSrc: string | null;
        fieldKey: keyof TournamentFormState;
        fileName: string;
        fileType: string;
        aspect: number;
    }>({
        open: false,
        imageSrc: null,
        fieldKey: "image",
        fileName: "tournament.jpg",
        fileType: "image/jpeg",
        aspect: 16 / 9,
    });
    const formatIdrInput = (value: number) => new Intl.NumberFormat(getIntlLocale(locale)).format(value);
    const gameOptions = useMemo(() => {
        if (games.length === 0) {
            return [{ value: "", label: t.dashboard.games.emptyOption }];
        }
        return games.map((game) => ({
            value: game.code,
            label: game.name,
        }));
    }, [games, t.dashboard.games.emptyOption]);

    const selectOptions = useMemo(() => {
        const options = t.dashboard.tournamentOptions;
        return {
            gameType: gameOptions,
            format: [
                { value: "BO1", label: options.format.bo1 },
                { value: "BO3", label: options.format.bo3 },
                { value: "BO5", label: options.format.bo5 },
            ],
            structure: [
                { value: "SINGLE_ELIM", label: options.structure.singleElim },
                { value: "DOUBLE_ELIM", label: options.structure.doubleElim },
                { value: "SWISS", label: options.structure.swiss },
            ],
            teamMode: [
                { value: "TEAM_BOARD", label: options.teamMode.teamBoard },
                { value: "TEAM_KOTH", label: options.teamMode.teamKoth },
            ],
            visibility: [
                { value: "PUBLIC", label: options.visibility.public },
                { value: "PRIVATE", label: options.visibility.private },
                { value: "UNLISTED", label: options.visibility.unlisted },
            ],
            maxPlayers: [8, 16, 32, 64, 128, 256].map((count) => ({
                value: String(count),
                label: t.dashboard.tournamentForm.maxPlayersLabel(count),
            })),
            status: [
                { value: "OPEN", label: options.status.open },
                { value: "ONGOING", label: options.status.ongoing },
                { value: "COMPLETED", label: options.status.completed },
                { value: "CANCELLED", label: options.status.cancelled },
            ],
            forfeitMode: [
                { value: "CHECKIN_ONLY", label: options.forfeitMode.checkinOnly },
                { value: "SCHEDULE_NO_SHOW", label: options.forfeitMode.scheduleNoShow },
            ],
        };
    }, [gameOptions, t]);

    useEffect(() => {
        if (!formData.gameType && games.length > 0) {
            setFormData((prev) => ({ ...prev, gameType: games[0].code }));
        }
    }, [formData.gameType, games, setFormData]);

    const gameSelectDisabled = gamesLoading || games.length === 0;

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

    const readFileAsDataUrl = (file: File) =>
        new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(new Error(t.dashboard.tournamentForm.errors.readFileFailed));
            reader.readAsDataURL(file);
        });

    const openCropper = async (file: File, fieldKey: keyof TournamentFormState, aspect: number) => {
        try {
            const previewUrl = await readFileAsDataUrl(file);
            setCropState({
                open: true,
                imageSrc: previewUrl,
                fieldKey,
                fileName: file.name || "tournament.jpg",
                fileType: file.type || "image/jpeg",
                aspect,
            });
        } catch (error) {
            console.error(t.dashboard.tournamentForm.errors.cropLoadFailed, error);
        }
    };

    const updateCustomField = (index: number, value: string) => {
        setFormData((prev) => ({
            ...prev,
            customFields: prev.customFields.map((field, idx) => (idx === index ? value : field)),
        }));
    };

    const forfeitAvailable = formData.checkInEnabled;
    const forfeitActive = formData.forfeitEnabled && forfeitAvailable;

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <FormSection title={t.dashboard.tournamentForm.sections.summaryTitle} description={t.dashboard.tournamentForm.sections.summaryDescription}>
                    <div className="space-y-4">
                        <div>
                            <label className={labelCls}>{t.dashboard.tournamentForm.labels.coverImage}</label>
                            <input
                                type="file"
                                accept="image/png,image/jpeg,image/jpg,image/webp"
                                className={`${inputCls} file:mr-3 file:rounded-xl file:border-0 file:bg-primary/15 file:px-3 file:py-1.5 file:font-semibold file:text-primary`}
                                onChange={async (e) => {
                                    const inputEl = e.currentTarget;
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    await openCropper(file, "image", 16 / 9);
                                    inputEl.value = "";
                                }}
                                disabled={uploadingImage}
                            />
                            {uploadingImage ? <p className="mt-2 text-xs text-base-content/45">{t.dashboard.tournamentForm.actions.uploadingImage}</p> : null}
                        </div>
                        {formData.image ? (
                            <div className="rounded-box border border-base-300 bg-base-200/40 p-2">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={normalizeAssetUrl(formData.image) || ""} alt={t.dashboard.tournamentForm.alt.coverPreview} className="h-44 w-full rounded-xl object-cover" />
                                <button type="button" onClick={() => setFormData((prev) => ({ ...prev, image: "" }))} className="mt-3 text-xs font-medium text-error hover:text-error/80">
                                    {t.dashboard.tournamentForm.actions.removeImage}
                                </button>
                            </div>
                        ) : null}
                        <div>
                            <label className={labelCls}>{t.dashboard.tournamentForm.labels.tournamentName}</label>
                            <input type="text" className={inputCls} required value={formData.title} onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))} />
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <label className={labelCls}>{t.dashboard.tournamentForm.labels.gameSelection}</label>
                            <FormSelect
                                value={formData.gameType}
                                onChange={(value) => setFormData((prev) => ({ ...prev, gameType: value }))}
                                options={selectOptions.gameType}
                                disabled={gameSelectDisabled}
                            />
                            {gameSelectDisabled ? (
                                <p className="mt-2 text-xs text-base-content/55">{t.dashboard.tournamentForm.hints.gameUnavailable}</p>
                            ) : null}
                            </div>
                            <div>
                                <label className={labelCls}>{t.dashboard.tournamentForm.labels.startTime}</label>
                                <DateTimePickerInput
                                    value={formData.startAt}
                                    onChange={(value) => setFormData((prev) => ({ ...prev, startAt: value }))}
                                    required
                                    className="w-full"
                                />
                            </div>
                        </div>
                        <div>
                            <label className={labelCls}>{t.dashboard.tournamentForm.labels.timezone}</label>
                            <FormSelect value={formData.timezone} onChange={(value) => setFormData((prev) => ({ ...prev, timezone: value }))} options={timeZoneOptions} />
                            <p className="mt-1 text-xs text-base-content/55">{t.dashboard.tournamentForm.hints.timezone}</p>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="rounded-box border border-base-300 bg-base-200/40 px-3 py-3">
                                <label className="flex items-center justify-between text-sm font-semibold text-base-content">
                                    {t.dashboard.tournamentForm.labels.onlineMode}
                                    <input
                                        type="checkbox"
                                        className="toggle toggle-primary"
                                        checked={formData.onlineMode === "ONLINE"}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, onlineMode: e.target.checked ? "ONLINE" : "OFFLINE" }))}
                                    />
                                </label>
                                <p className="mt-2 text-xs text-base-content/55">{t.dashboard.tournamentForm.hints.onlineMode}</p>
                            </div>
                            <div className="rounded-box border border-base-300 bg-base-200/40 px-3 py-3">
                                <label className="flex items-center justify-between text-sm font-semibold text-base-content">
                                    {t.dashboard.tournamentForm.labels.checkInEnabled}
                                    <input
                                        type="checkbox"
                                        className="toggle toggle-primary"
                                        checked={formData.checkInEnabled}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                checkInEnabled: e.target.checked,
                                                forfeitEnabled: e.target.checked ? prev.forfeitEnabled : false,
                                            }))
                                        }
                                    />
                                </label>
                                <p className="mt-2 text-xs text-base-content/55">{t.dashboard.tournamentForm.hints.checkInEnabled}</p>
                            </div>
                        </div>
                    </div>
                </FormSection>
                <FormSection title={t.dashboard.tournamentForm.sections.autoForfeitTitle} description={t.dashboard.tournamentForm.sections.autoForfeitDescription}>
                    <div className="space-y-4">
                        <label className="flex items-center justify-between rounded-box border border-base-300 bg-base-200/40 px-3 py-3 text-sm font-semibold text-base-content">
                            {t.dashboard.tournamentForm.labels.autoForfeit}
                            <input
                                type="checkbox"
                                className="toggle toggle-primary"
                                checked={formData.forfeitEnabled}
                                disabled={!forfeitAvailable}
                                onChange={(e) => setFormData((prev) => ({ ...prev, forfeitEnabled: e.target.checked }))}
                            />
                        </label>
                        <p className="text-xs text-base-content/55">
                            {t.dashboard.tournamentForm.hints.forfeitUnavailable}
                        </p>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <label className={labelCls}>{t.dashboard.tournamentForm.labels.graceMinutes}</label>
                                <input
                                    type="number"
                                    min={1}
                                    className={inputCls}
                                    value={formData.forfeitGraceMinutes}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, forfeitGraceMinutes: Number(e.target.value) }))}
                                    disabled={!forfeitActive}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>{t.dashboard.tournamentForm.labels.mode}</label>
                                <FormSelect
                                    value={formData.forfeitMode}
                                    onChange={(value) => setFormData((prev) => ({ ...prev, forfeitMode: value }))}
                                    options={selectOptions.forfeitMode}
                                    disabled={!forfeitActive}
                                />
                            </div>
                        </div>
                    </div>
                </FormSection>
                <FormSection title={t.dashboard.tournamentForm.sections.detailsTitle} description={t.dashboard.tournamentForm.sections.detailsDescription}>
                    <textarea
                        className={`${inputCls} min-h-[220px] resize-y`}
                        value={formData.longDescription}
                        onChange={(e) => setFormData((prev) => ({ ...prev, longDescription: e.target.value }))}
                        placeholder={t.dashboard.tournamentForm.placeholders.longDescription}
                    />
                    <p className="mt-2 text-xs text-base-content/45">{t.dashboard.tournamentForm.hints.details}</p>
                </FormSection>

                <FormSection title={t.dashboard.tournamentForm.sections.privacyTitle} description={t.dashboard.tournamentForm.sections.privacyDescription}>
                    <div className="space-y-3">
                        <FormSelect
                            value={formData.visibility}
                            onChange={(value) => setFormData((prev) => ({ ...prev, visibility: value }))}
                            options={selectOptions.visibility}
                        />
                        <div>
                            <label className={labelCls}>{t.dashboard.tournamentForm.labels.passwordOptional}</label>
                            <input
                                type="text"
                                className={inputCls}
                                value={formData.privacyPassword}
                                onChange={(e) => setFormData((prev) => ({ ...prev, privacyPassword: e.target.value }))}
                                placeholder={t.dashboard.tournamentForm.placeholders.privacyPassword}
                            />
                        </div>
                    </div>
                </FormSection>
                <FormSection title={t.dashboard.tournamentForm.sections.mediaTitle} description={t.dashboard.tournamentForm.sections.mediaDescription}>
                    <div className="space-y-4">
                        <div>
                            <label className={labelCls}>{t.dashboard.tournamentForm.labels.streamUrl}</label>
                            <input
                                type="url"
                                className={inputCls}
                                value={formData.streamUrl}
                                onChange={(e) => setFormData((prev) => ({ ...prev, streamUrl: e.target.value }))}
                                placeholder={t.dashboard.tournamentForm.placeholders.streamUrl}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>{t.dashboard.tournamentForm.labels.matchGuideImage}</label>
                            <input
                                type="file"
                                accept="image/png,image/jpeg,image/jpg,image/webp"
                                className={`${inputCls} file:mr-3 file:rounded-xl file:border-0 file:bg-primary/15 file:px-3 file:py-1.5 file:font-semibold file:text-primary`}
                                onChange={async (e) => {
                                    const inputEl = e.currentTarget;
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    await openCropper(file, "matchGuideImage", 16 / 9);
                                    inputEl.value = "";
                                }}
                            />
                            {formData.matchGuideImage ? (
                                <div className="mt-3 rounded-box border border-base-300 bg-base-200/40 p-2">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={normalizeAssetUrl(formData.matchGuideImage) || ""}
                                        alt={t.dashboard.tournamentForm.alt.matchGuidePreview}
                                        className="h-32 w-full rounded-xl object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setFormData((prev) => ({ ...prev, matchGuideImage: "" }))}
                                        className="mt-2 text-xs font-medium text-error hover:text-error/80"
                                    >
                                        {t.dashboard.tournamentForm.actions.removeMatchGuideImage}
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </FormSection>

                <FormSection title={t.dashboard.tournamentForm.sections.contactTitle} description={t.dashboard.tournamentForm.sections.contactDescription}>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                            <label className={labelCls}>{t.dashboard.tournamentForm.labels.discord}</label>
                            <input className={inputCls} value={formData.organizerDiscord} onChange={(e) => setFormData((prev) => ({ ...prev, organizerDiscord: e.target.value }))} placeholder={t.dashboard.tournamentForm.placeholders.discord} />
                        </div>
                        <div>
                            <label className={labelCls}>{t.dashboard.tournamentForm.labels.twitter}</label>
                            <input className={inputCls} value={formData.organizerTwitter} onChange={(e) => setFormData((prev) => ({ ...prev, organizerTwitter: e.target.value }))} placeholder={t.dashboard.tournamentForm.placeholders.twitter} />
                        </div>
                        <div>
                            <label className={labelCls}>{t.dashboard.tournamentForm.labels.email}</label>
                            <input className={inputCls} value={formData.organizerEmail} onChange={(e) => setFormData((prev) => ({ ...prev, organizerEmail: e.target.value }))} placeholder={t.dashboard.tournamentForm.placeholders.email} />
                        </div>
                        <div>
                            <label className={labelCls}>{t.dashboard.tournamentForm.labels.website}</label>
                            <input className={inputCls} value={formData.organizerWebsite} onChange={(e) => setFormData((prev) => ({ ...prev, organizerWebsite: e.target.value }))} placeholder={t.dashboard.tournamentForm.placeholders.website} />
                        </div>
                    </div>
                </FormSection>
                <FormSection title={t.dashboard.tournamentForm.sections.visualTitle} description={t.dashboard.tournamentForm.sections.visualDescription}>
                    <div className="space-y-4">
                        <div>
                            <label className={labelCls}>{t.dashboard.tournamentForm.labels.bannerImage}</label>
                            <input
                                type="file"
                                accept="image/png,image/jpeg,image/jpg,image/webp"
                                className={`${inputCls} file:mr-3 file:rounded-xl file:border-0 file:bg-primary/15 file:px-3 file:py-1.5 file:font-semibold file:text-primary`}
                                onChange={async (e) => {
                                    const inputEl = e.currentTarget;
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    await openCropper(file, "bannerImage", 16 / 9);
                                    inputEl.value = "";
                                }}
                            />
                            {formData.bannerImage ? (
                                <div className="mt-3 rounded-box border border-base-300 bg-base-200/40 p-2">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={normalizeAssetUrl(formData.bannerImage) || ""}
                                        alt={t.dashboard.tournamentForm.alt.bannerPreview}
                                        className="h-32 w-full rounded-xl object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setFormData((prev) => ({ ...prev, bannerImage: "" }))}
                                        className="mt-2 text-xs font-medium text-error hover:text-error/80"
                                    >
                                        {t.dashboard.tournamentForm.actions.removeBannerImage}
                                    </button>
                                </div>
                            ) : null}
                        </div>
                        <div>
                            <label className={labelCls}>{t.dashboard.tournamentForm.labels.eventColorTheme}</label>
                            <input
                                type="color"
                                className="h-11 w-full rounded-box border border-base-300 bg-base-100 px-2"
                                value={formData.themeColor}
                                onChange={(e) => setFormData((prev) => ({ ...prev, themeColor: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>{t.dashboard.tournamentForm.labels.backgroundImageOptional}</label>
                            <input
                                type="file"
                                accept="image/png,image/jpeg,image/jpg,image/webp"
                                className={`${inputCls} file:mr-3 file:rounded-xl file:border-0 file:bg-primary/15 file:px-3 file:py-1.5 file:font-semibold file:text-primary`}
                                onChange={async (e) => {
                                    const inputEl = e.currentTarget;
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    await openCropper(file, "backgroundImage", 16 / 9);
                                    inputEl.value = "";
                                }}
                            />
                            {formData.backgroundImage ? (
                                <div className="mt-3 rounded-box border border-base-300 bg-base-200/40 p-2">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={normalizeAssetUrl(formData.backgroundImage) || ""}
                                        alt={t.dashboard.tournamentForm.alt.backgroundPreview}
                                        className="h-32 w-full rounded-xl object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setFormData((prev) => ({ ...prev, backgroundImage: "" }))}
                                        className="mt-2 text-xs font-medium text-error hover:text-error/80"
                                    >
                                        {t.dashboard.tournamentForm.actions.removeBackgroundImage}
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </FormSection>

                <FormSection title={t.dashboard.tournamentForm.sections.structureTitle} description={t.dashboard.tournamentForm.sections.structureDescription}>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <label className={labelCls}>{t.dashboard.tournamentForm.labels.tournamentFormat}</label>
                                <FormSelect value={formData.structure} onChange={(value) => setFormData((prev) => ({ ...prev, structure: value }))} options={selectOptions.structure} />
                            </div>
                            <div>
                                <label className={labelCls}>{t.dashboard.tournamentForm.labels.matchFormat}</label>
                                <FormSelect value={formData.format} onChange={(value) => setFormData((prev) => ({ ...prev, format: value }))} options={selectOptions.format} />
                            </div>
                        </div>
                        <label className="flex items-center justify-between rounded-box border border-base-300 bg-base-200/40 px-3 py-3 text-sm font-semibold text-base-content">
                            {t.dashboard.tournamentForm.labels.teamTournament}
                            <input
                                type="checkbox"
                                className="toggle toggle-primary"
                                checked={formData.isTeamTournament}
                                onChange={(e) => {
                                    const checked = e.target.checked;
                                    setFormData((prev) => ({
                                        ...prev,
                                        isTeamTournament: checked,
                                        lineupSize: checked ? prev.lineupSize : "",
                                        mode: checked ? (prev.mode === "INDIVIDUAL" ? "TEAM_BOARD" : prev.mode) : "INDIVIDUAL",
                                    }));
                                }}
                            />
                        </label>
                        {formData.isTeamTournament ? (
                            <div>
                                <label className={labelCls}>{t.dashboard.tournamentForm.labels.teamMode}</label>
                                <FormSelect
                                    value={formData.mode}
                                    onChange={(value) => setFormData((prev) => ({ ...prev, mode: value }))}
                                    options={selectOptions.teamMode}
                                />
                                <p className="mt-2 text-xs text-base-content/50">
                                    {t.dashboard.tournamentForm.hints.teamMode}
                                </p>
                            </div>
                        ) : null}
                        {formData.isTeamTournament ? (
                            <div>
                                <label className={labelCls}>{t.dashboard.tournamentForm.labels.lineupSizeOptional}</label>
                                <input
                                    type="number"
                                    min={1}
                                    step={1}
                                    className={inputCls}
                                    value={formData.lineupSize}
                                    onChange={(event) => setFormData((prev) => ({ ...prev, lineupSize: event.target.value }))}
                                    placeholder={t.dashboard.tournamentForm.placeholders.lineupSize}
                                />
                                <p className="mt-2 text-xs text-base-content/45">
                                    {t.dashboard.tournamentForm.hints.lineupSize}
                                </p>
                            </div>
                        ) : null}
                        <label className="flex items-center justify-between rounded-box border border-base-300 bg-base-200/40 px-3 py-3 text-sm font-semibold text-base-content">
                            {t.dashboard.tournamentForm.labels.thirdPlaceMatch}
                            <input type="checkbox" className="toggle toggle-primary" checked={formData.thirdPlaceMatch} onChange={(e) => setFormData((prev) => ({ ...prev, thirdPlaceMatch: e.target.checked }))} />
                        </label>
                        <label className="flex items-center justify-between rounded-box border border-base-300 bg-base-200/40 px-3 py-3 text-sm font-semibold text-base-content">
                            {t.dashboard.tournamentForm.labels.groupStage}
                            <input type="checkbox" className="toggle toggle-primary" checked={formData.groupStageEnabled} onChange={(e) => setFormData((prev) => ({ ...prev, groupStageEnabled: e.target.checked }))} />
                        </label>
                        {formData.groupStageEnabled ? (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div>
                                    <label className={labelCls}>{t.dashboard.tournamentForm.labels.numberOfGroups}</label>
                                    <input type="number" className={inputCls} min={2} value={formData.groupCount} onChange={(e) => setFormData((prev) => ({ ...prev, groupCount: Number(e.target.value) }))} />
                                </div>
                                <div>
                                    <label className={labelCls}>{t.dashboard.tournamentForm.labels.playersPerGroup}</label>
                                    <input type="number" className={inputCls} min={4} value={formData.playersPerGroup} onChange={(e) => setFormData((prev) => ({ ...prev, playersPerGroup: Number(e.target.value) }))} />
                                </div>
                            </div>
                        ) : null}
                    </div>
                </FormSection>
                <FormSection title={t.dashboard.tournamentForm.sections.participantTitle} description={t.dashboard.tournamentForm.sections.participantDescription}>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <label className={labelCls}>
                                    {formData.isTeamTournament ? t.dashboard.tournamentForm.labels.maxTeams : t.dashboard.tournamentForm.labels.maxPlayers}
                                </label>
                                <input
                                    type="number"
                                    min={2}
                                    step={1}
                                    className={inputCls}
                                    value={formData.maxPlayers}
                                    onChange={(event) => setFormData((prev) => ({ ...prev, maxPlayers: event.target.value }))}
                                    placeholder={t.dashboard.tournamentForm.placeholders.maxPlayers}
                                />
                                <p className="mt-2 text-xs text-base-content/45">
                                    {t.dashboard.tournamentForm.hints.bracketSize}
                                </p>
                            </div>
                            <div>
                                <label className={labelCls}>{t.dashboard.tournamentForm.labels.entryFee}</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    className={inputCls}
                                    value={formData.entryFee ? formatIdrInput(formData.entryFee) : ""}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, entryFee: parseIdrInput(e.target.value) }))}
                                    placeholder={t.dashboard.tournamentForm.placeholders.entryFee}
                                />
                            </div>
                        </div>
                        <div>
                            <label className={labelCls}>{t.dashboard.tournamentForm.labels.prizePool}</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                className={inputCls}
                                value={formData.prizePool ? formatIdrInput(formData.prizePool) : ""}
                                onChange={(e) => setFormData((prev) => ({ ...prev, prizePool: parseIdrInput(e.target.value) }))}
                                placeholder={t.dashboard.tournamentForm.placeholders.prizePool}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>{t.dashboard.tournamentForm.labels.participationRules}</label>
                            <textarea className={`${inputCls} min-h-[120px] resize-y`} value={formData.participationRules} onChange={(e) => setFormData((prev) => ({ ...prev, participationRules: e.target.value }))} placeholder={t.dashboard.tournamentForm.placeholders.participationRules} />
                        </div>
                    </div>
                </FormSection>

                <FormSection title={t.dashboard.tournamentForm.sections.entryPeriodTitle} description={t.dashboard.tournamentForm.sections.entryPeriodDescription}>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                            <label className={labelCls}>{t.dashboard.tournamentForm.labels.registrationStart}</label>
                            <DateTimePickerInput
                                value={formData.registrationStart}
                                onChange={(value) => setFormData((prev) => ({ ...prev, registrationStart: value }))}
                                className="w-full"
                            />
                        </div>
                        <div>
                            <label className={labelCls}>{t.dashboard.tournamentForm.labels.registrationEnd}</label>
                            <DateTimePickerInput
                                value={formData.registrationEnd}
                                onChange={(value) => setFormData((prev) => ({ ...prev, registrationEnd: value }))}
                                className="w-full"
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label className={labelCls}>{t.dashboard.tournamentForm.labels.lateCancelDeadline}</label>
                            <DateTimePickerInput
                                value={formData.lateCancelDeadline}
                                onChange={(value) => setFormData((prev) => ({ ...prev, lateCancelDeadline: value }))}
                                className="w-full"
                            />
                        </div>
                    </div>
                </FormSection>
                <FormSection title={t.dashboard.tournamentForm.sections.entryFormTitle} description={t.dashboard.tournamentForm.sections.entryFormDescription}>
                    <div className="space-y-4">
                        <div>
                            <label className={labelCls}>{t.dashboard.tournamentForm.labels.entryDisplayName}</label>
                            <input className={inputCls} value={formData.entryDisplayName} onChange={(e) => setFormData((prev) => ({ ...prev, entryDisplayName: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className={labelCls}>{t.dashboard.tournamentForm.labels.customParticipantFields}</label>
                                <button
                                    type="button"
                                    className="btn btn-outline btn-xs"
                                    onClick={() => setFormData((prev) => ({ ...prev, customFields: [...prev.customFields, ""] }))}
                                >
                                    {t.dashboard.tournamentForm.actions.addCustomField}
                                </button>
                            </div>
                            {formData.customFields.length === 0 ? (
                                <div className="rounded-box border border-dashed border-base-300 bg-base-200/40 px-3 py-4 text-xs text-base-content/50">
                                    {t.dashboard.tournamentForm.emptyCustomFields}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {formData.customFields.map((field, index) => (
                                        <div key={`${field}-${index}`} className="flex items-center gap-2">
                                            <input
                                                className={inputCls}
                                                value={field}
                                                onChange={(e) => updateCustomField(index, e.target.value)}
                                                placeholder={t.dashboard.tournamentForm.placeholders.customFieldExample}
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
                                                {t.common.delete}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </FormSection>

                <FormSection title={t.dashboard.tournamentForm.sections.publishTitle} description={t.dashboard.tournamentForm.sections.publishDescription}>
                    <div className="space-y-3">
                        {showStatus ? (
                            <div>
                                <label className={labelCls}>{t.dashboard.tournamentForm.labels.status}</label>
                                <FormSelect value={formData.status} onChange={(value) => setFormData((prev) => ({ ...prev, status: value }))} options={selectOptions.status} />
                            </div>
                        ) : null}
                        <label className="flex items-center justify-between rounded-box border border-base-300 bg-base-200/40 px-3 py-3 text-sm font-semibold text-base-content">
                            {t.dashboard.tournamentForm.labels.publishNow}
                            <input type="checkbox" className="toggle toggle-primary" checked={formData.publishNow} onChange={(e) => setFormData((prev) => ({ ...prev, publishNow: e.target.checked }))} />
                        </label>
                        <label className="flex items-center justify-between rounded-box border border-base-300 bg-base-200/40 px-3 py-3 text-sm font-semibold text-base-content">
                            {t.dashboard.tournamentForm.labels.allowEditUntilStart}
                            <input type="checkbox" className="toggle toggle-primary" checked={formData.allowEditUntilStart} onChange={(e) => setFormData((prev) => ({ ...prev, allowEditUntilStart: e.target.checked }))} />
                        </label>
                        <div className="rounded-box border border-base-300 bg-base-200/40 px-3 py-3 text-xs text-base-content/55">
                            {t.dashboard.tournamentForm.hints.publishPreview}
                        </div>
                    </div>
                </FormSection>
            </div>
            <div className="flex justify-end gap-3">
                <button type="submit" disabled={submitting} className={btnPrimary}>
                    {submitting ? t.dashboard.tournamentForm.actions.saving : submitLabel}
                </button>
            </div>
            {confirmPublishOpen ? (
                <div className="modal modal-open">
                    <div className="modal-box max-w-md">
                        <h3 className="text-lg font-bold">{t.dashboard.tournamentForm.confirmPublish.title}</h3>
                        <p className="mt-2 text-sm text-base-content/60">{t.dashboard.tournamentForm.confirmPublish.message}</p>
                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={() => {
                                    setConfirmPublishOpen(false);
                                    setPendingSubmit(false);
                                }}
                            >
                                {t.dashboard.tournamentForm.confirmPublish.cancel}
                            </button>
                            <button type="button" className={btnPrimary} onClick={handleConfirmPublish}>
                                {t.dashboard.tournamentForm.confirmPublish.confirm}
                            </button>
                        </div>
                    </div>
                    <div className="modal-backdrop" />
                </div>
            ) : null}

            <ImageCropModal
                open={cropState.open}
                imageSrc={cropState.imageSrc}
                title={t.dashboard.tournamentForm.actions.cropTitle}
                aspect={cropState.aspect}
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
                    await handleUploadAsset(croppedFile, cropState.fieldKey);
                    setCropState((prev) => ({
                        ...prev,
                        open: false,
                        imageSrc: null,
                    }));
                }}
            />
        </form>
    );
}
