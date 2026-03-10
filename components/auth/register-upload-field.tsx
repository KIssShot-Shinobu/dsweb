"use client";

export type UploadPreview = {
    previewUrl: string;
    expiresAt: string;
};

type RegisterUploadFieldProps = {
    label: string;
    helperText?: string;
    preview: UploadPreview | null;
    uploading: boolean;
    error?: string;
    onUpload: (file: File) => void;
    onClear: () => void;
};

export function RegisterUploadField({
    label,
    helperText,
    preview,
    uploading,
    error,
    onUpload,
    onClear,
}: RegisterUploadFieldProps) {
    return (
        <div>
            <label className="label pb-2 pt-0 text-[11px] font-semibold uppercase tracking-[0.22em] text-base-content/50">{label}</label>
            {helperText ? <p className="mb-2 text-xs text-base-content/45">{helperText}</p> : null}
            {preview ? (
                <div className="flex flex-col gap-3 rounded-box border border-base-300 bg-base-200/60 p-3 sm:flex-row sm:items-center">
                    <img src={preview.previewUrl} className="h-20 w-full rounded-box object-cover sm:w-28" alt={label} />
                    <div className="flex-1 space-y-1 text-xs text-base-content/55">
                        <p>File tersimpan sementara hingga proses pendaftaran selesai.</p>
                        <p>Berlaku sampai: {new Date(preview.expiresAt).toLocaleString("id-ID")}</p>
                    </div>
                    <button type="button" onClick={onClear} className="btn btn-error btn-xs btn-outline w-fit rounded-box">
                        Hapus file
                    </button>
                </div>
            ) : (
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-box border border-dashed border-base-300 bg-base-200/40 px-4 py-3 transition-all hover:border-primary/40 hover:bg-base-200/70">
                    <span className="text-sm text-base-content/55">{uploading ? "Mengunggah file..." : "Unggah screenshot"}</span>
                    <span className="btn btn-primary btn-xs rounded-box">Pilih File</span>
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
