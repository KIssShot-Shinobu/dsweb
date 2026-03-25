"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeAssetUrl } from "@/lib/asset-url";
import { useToast } from "@/components/dashboard/toast";
import { ConfirmModal } from "@/components/dashboard/confirm-modal";
import { ImageCropModal } from "@/components/ui/image-crop-modal";
import { useLocale } from "@/hooks/use-locale";

function getInitials(name: string) {
    return (
        name
            .split(/[\s._-]+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((segment) => segment[0]?.toUpperCase())
            .join("") || "DS"
    );
}

export function ProfileAvatarForm({
    username,
    fullName,
    initialAvatarUrl,
}: {
    username: string;
    fullName: string;
    initialAvatarUrl: string | null | undefined;
}) {
    const router = useRouter();
    const { t } = useLocale();
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const { success, error } = useToast();
    const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl || null);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
    const [cropState, setCropState] = useState<{
        open: boolean;
        imageSrc: string | null;
        fileName: string;
        fileType: string;
    }>({
        open: false,
        imageSrc: null,
        fileName: "avatar.jpg",
        fileType: "image/jpeg",
    });

    const displayName = username || fullName;
    const previewUrl = normalizeAssetUrl(avatarUrl);

    const broadcastUserRefresh = () => {
        window.dispatchEvent(new Event("ds:user-updated"));
        router.refresh();
    };

    const saveAvatar = async (nextAvatarUrl: string | null) => {
        setSaving(true);
        try {
            const response = await fetch("/api/profile/avatar", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ avatarUrl: nextAvatarUrl }),
            });
            const data = await response.json();

            if (!response.ok || !data?.success) {
                error(data?.message || t.dashboard.profile.avatar.errors.saveFailed);
                return false;
            }

            setAvatarUrl(data.avatarUrl ?? null);
            success(data.message || t.dashboard.profile.avatar.success.saved);
            broadcastUserRefresh();
            return true;
        } catch {
            error(t.dashboard.profile.avatar.errors.saveNetwork);
            return false;
        } finally {
            setSaving(false);
        }
    };

    const uploadAvatarFile = async (file: File) => {
        const formData = new FormData();
        formData.append("file", file);

        setUploading(true);
        try {
            const uploadResponse = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });
            const uploadData = await uploadResponse.json();

            if (!uploadResponse.ok || !uploadData?.success || !uploadData?.url) {
                error(uploadData?.message || t.dashboard.profile.avatar.errors.uploadFailed);
                return;
            }

            await saveAvatar(uploadData.url);
        } catch {
            error(t.dashboard.profile.avatar.errors.uploadNetwork);
        } finally {
            setUploading(false);
        }
    };

    const readFileAsDataUrl = (file: File) =>
        new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(new Error(t.dashboard.profile.avatar.errors.readFileFailed));
            reader.readAsDataURL(file);
        });

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const previewUrl = await readFileAsDataUrl(file);
            setCropState({
                open: true,
                imageSrc: previewUrl,
                fileName: file.name || "avatar.jpg",
                fileType: file.type || "image/jpeg",
            });
        } catch {
            error(t.dashboard.profile.avatar.errors.cropLoadFailed);
        } finally {
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const handleRemoveAvatar = async () => {
        if (!avatarUrl) {
            return;
        }

        setShowRemoveConfirm(false);
        await saveAvatar(null);
    };

    return (
        <>
            <div className="space-y-3">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={uploading || saving}
                />

                <div className="relative h-20 w-20">
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading || saving}
                        className="group relative h-20 w-20 overflow-hidden rounded-box border border-base-300 bg-primary/15 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
                        title={t.dashboard.profile.avatar.changeTitle}
                    >
                        {previewUrl ? (
                            <Image
                                unoptimized
                                src={previewUrl}
                                alt={displayName}
                                width={80}
                                height={80}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-2xl font-black text-primary">
                                {getInitials(displayName)}
                            </div>
                        )}
                        <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/55 via-black/10 to-transparent px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                            {uploading || saving ? t.dashboard.profile.avatar.processing : t.dashboard.profile.avatar.change}
                        </div>
                    </button>

                    {avatarUrl ? (
                        <button
                            type="button"
                            onClick={() => setShowRemoveConfirm(true)}
                            disabled={uploading || saving}
                            className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border border-base-100 bg-error text-error-content shadow-lg transition-all hover:scale-105 hover:bg-error/85 disabled:cursor-not-allowed disabled:opacity-70"
                            title={t.dashboard.profile.avatar.removeTitle}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 6h18" />
                                <path d="M8 6V4h8v2" />
                                <path d="M19 6l-1 14H6L5 6" />
                                <path d="M10 11v6" />
                                <path d="M14 11v6" />
                            </svg>
                        </button>
                    ) : null}
                </div>

                <div className="space-y-1">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-base-content/45">
                        {t.dashboard.profile.avatar.title}
                    </div>
                    <p className="max-w-sm text-sm leading-6 text-base-content/60">
                        {t.dashboard.profile.avatar.description}
                    </p>
                </div>
            </div>

            <ConfirmModal
                open={showRemoveConfirm}
                title={t.dashboard.profile.avatar.confirmTitle}
                message={t.dashboard.profile.avatar.confirmMessage}
                confirmLabel={saving ? t.dashboard.profile.avatar.processing : t.dashboard.profile.avatar.confirmButton}
                cancelLabel={t.common.cancel}
                danger
                onConfirm={handleRemoveAvatar}
                onCancel={() => (saving ? null : setShowRemoveConfirm(false))}
            />

            <ImageCropModal
                open={cropState.open}
                imageSrc={cropState.imageSrc}
                title={t.dashboard.profile.avatar.cropTitle}
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
                    await uploadAvatarFile(croppedFile);
                    setCropState((prev) => ({
                        ...prev,
                        open: false,
                        imageSrc: null,
                    }));
                }}
            />
        </>
    );
}
