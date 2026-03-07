"use client";

export type UploadPreview = {
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
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">{label}</label>
            {preview ? (
                <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 sm:flex-row sm:items-center">
                    <img src={preview.previewUrl} className="h-20 w-full rounded-xl object-cover sm:w-28" alt={label} />
                    <div className="flex-1 space-y-1 text-xs text-white/40">
                        <p>Tersimpan sementara sampai pendaftaran selesai.</p>
                        <p>Expired: {new Date(preview.expiresAt).toLocaleString("id-ID")}</p>
                    </div>
                    <button type="button" onClick={onClear} className="w-fit text-xs font-medium text-red-400 hover:text-red-300">
                        Hapus
                    </button>
                </div>
            ) : (
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-dashed border-white/20 bg-white/[0.02] px-4 py-3 transition-all hover:border-ds-amber/40 hover:bg-white/[0.04]">
                    <span className="text-sm text-white/45">{uploading ? "Mengupload..." : "Upload screenshot"}</span>
                    <span className="rounded-xl bg-ds-amber/10 px-3 py-1.5 text-xs font-semibold text-ds-amber">Pilih file</span>
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
