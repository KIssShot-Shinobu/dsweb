"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeAssetUrl } from "@/lib/asset-url";
import { useToast } from "@/components/dashboard/toast";
import { ConfirmModal } from "@/components/dashboard/confirm-modal";

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
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const { success, error } = useToast();
    const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl || null);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

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
                error(data?.message || "Gagal menyimpan foto profil.");
                return false;
            }

            setAvatarUrl(data.avatarUrl ?? null);
            success(data.message || "Foto profil berhasil diperbarui.");
            broadcastUserRefresh();
            return true;
        } catch {
            error("Terjadi gangguan jaringan saat menyimpan foto profil.");
            return false;
        } finally {
            setSaving(false);
        }
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

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
                error(uploadData?.message || "Upload avatar gagal.");
                return;
            }

            await saveAvatar(uploadData.url);
        } catch {
            error("Terjadi gangguan jaringan saat upload avatar.");
        } finally {
            setUploading(false);
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
                        className="group relative h-20 w-20 overflow-hidden rounded-[24px] border border-black/5 bg-ds-amber transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70 dark:border-white/8"
                        title="Klik untuk mengganti avatar"
                    >
                        {previewUrl ? (
                            <img src={previewUrl} alt={displayName} className="h-full w-full object-cover" />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-2xl font-black text-black">
                                {getInitials(displayName)}
                            </div>
                        )}
                        <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/55 via-black/10 to-transparent px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                            {uploading || saving ? "Memproses" : "Ganti"}
                        </div>
                    </button>

                    {avatarUrl ? (
                        <button
                            type="button"
                            onClick={() => setShowRemoveConfirm(true)}
                            disabled={uploading || saving}
                            className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border border-white/70 bg-red-500 text-white shadow-lg transition-all hover:scale-105 hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-70 dark:border-[#101014]"
                            title="Hapus avatar"
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
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-white/35">
                        Foto Profil
                    </div>
                    <p className="max-w-sm text-sm leading-6 text-slate-500 dark:text-white/45">
                        Klik avatar untuk mengganti. Format PNG, JPG, atau WEBP dengan ukuran maksimal 5MB.
                    </p>
                </div>
            </div>

            <ConfirmModal
                open={showRemoveConfirm}
                title="Hapus foto profil?"
                message="Foto profil akan dihapus dan tampilan akun akan kembali memakai inisial. Aksi ini bisa Anda ganti lagi kapan saja."
                confirmLabel={saving ? "Memproses..." : "Hapus Avatar"}
                cancelLabel="Batal"
                danger
                onConfirm={handleRemoveAvatar}
                onCancel={() => (saving ? null : setShowRemoveConfirm(false))}
            />
        </>
    );
}
