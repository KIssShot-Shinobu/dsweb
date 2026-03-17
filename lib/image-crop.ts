type CropArea = {
    width: number;
    height: number;
    x: number;
    y: number;
};

type CropOptions = {
    mimeType?: string;
    quality?: number;
};

function loadImage(src: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = src;
    });
}

export async function getCroppedBlob(imageSrc: string, crop: CropArea, options: CropOptions = {}) {
    const image = await loadImage(imageSrc);
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
        throw new Error("Canvas tidak tersedia untuk crop.");
    }

    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(crop.width * pixelRatio);
    canvas.height = Math.floor(crop.height * pixelRatio);

    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.imageSmoothingQuality = "high";
    context.drawImage(
        image,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        crop.width,
        crop.height
    );

    const mimeType = options.mimeType || "image/jpeg";
    const quality = options.quality ?? 0.92;

    const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((result) => resolve(result), mimeType, quality);
    });

    if (!blob) {
        throw new Error("Gagal membuat gambar hasil crop.");
    }

    return blob;
}
