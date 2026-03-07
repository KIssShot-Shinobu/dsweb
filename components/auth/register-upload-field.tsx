"use client";

type UploadPreview = {
    previewUrl: string;
    expiresAt: string;
};

type RegisterUploadFieldProps = {
    label: string;
    preview: UploadPreview | null;
    uploading: boolean;
    error?: string;
    onUpload: (file: File) => void;
    onClear: () => void;
};

export function RegisterUploadField({
    label,
    preview,
    uploading,
    error,
    onUpload,
    onClear,
}: RegisterUploadFieldProps) {
    return (
        <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/50">
                {label}
            </label>
            {preview ? (
                <div className="flex items-center gap-3">
                    <img src={preview.previewUrl} className="h-16 rounded-lg object-cover" alt={label} />
                    <div className="space-y-1 text-xs text-white/40">
                        <p>Tersimpan sementara sampai pendaftaran selesai.</p>
                        <p>Expired: {new Date(preview.expiresAt).toLocaleString("id-ID")}</p>
                    </div>
                    <button type="button" onClick={onClear} className="text-xs text-red-400 hover:text-red-300">
                        Hapus
                    </button>
                </div>
            ) : (
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-white/20 px-4 py-3 transition-all hover:border-ds-amber/40">
                    <span className="text-sm text-white/40">{uploading ? "Mengupload..." : "Upload screenshot"}</span>
                    <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) onUpload(file);
                            event.currentTarget.value = "";
                        }}
                    />
                </label>
            )}
            {error ? <p className="mt-1 text-xs text-red-400">{error}</p> : null}
        </div>
    );
}
