"use client";

import { useCallback, useMemo, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { getCroppedBlob } from "@/lib/image-crop";

type ImageCropModalProps = {
    open: boolean;
    imageSrc: string | null;
    title?: string;
    aspect?: number;
    outputType?: string;
    onCancel: () => void;
    onComplete: (blob: Blob) => Promise<void> | void;
};

export function ImageCropModal({
    open,
    imageSrc,
    title = "Sesuaikan Gambar",
    aspect = 1,
    outputType = "image/jpeg",
    onCancel,
    onComplete,
}: ImageCropModalProps) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedArea, setCroppedArea] = useState<Area | null>(null);
    const [saving, setSaving] = useState(false);

    const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
        setCroppedArea(croppedAreaPixels);
    }, []);

    const canRender = open && Boolean(imageSrc);
    const backdropCls = useMemo(() => (open ? "modal modal-open" : "modal"), [open]);

    const handleSave = async () => {
        if (!imageSrc || !croppedArea) return;
        try {
            setSaving(true);
            const blob = await getCroppedBlob(imageSrc, croppedArea, { mimeType: outputType });
            await onComplete(blob);
        } finally {
            setSaving(false);
        }
    };

    if (!canRender) return null;

    return (
        <div className={backdropCls}>
            <div className="modal-box max-w-3xl border border-base-300 bg-base-100">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-bold">{title}</h3>
                    <button type="button" className="btn btn-sm btn-ghost" onClick={onCancel} disabled={saving}>
                        Close
                    </button>
                </div>
                <div className="relative h-[360px] w-full overflow-hidden rounded-box border border-base-300 bg-base-200/40">
                    <Cropper
                        image={imageSrc || undefined}
                        crop={crop}
                        zoom={zoom}
                        aspect={aspect}
                        onCropChange={setCrop}
                        onCropComplete={onCropComplete}
                        onZoomChange={setZoom}
                    />
                </div>
                <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between gap-4 text-sm">
                        <span className="font-semibold text-base-content/70">Zoom</span>
                        <input
                            type="range"
                            min={1}
                            max={3}
                            step={0.05}
                            value={zoom}
                            onChange={(event) => setZoom(Number(event.target.value))}
                            className="range range-primary range-sm"
                        />
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>
                            Batal
                        </button>
                        <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                            {saving ? "Menyimpan..." : "Gunakan Gambar"}
                        </button>
                    </div>
                </div>
            </div>
            <div className="modal-backdrop" onClick={onCancel} />
        </div>
    );
}

