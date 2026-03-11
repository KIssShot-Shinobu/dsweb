import Image from "next/image";
import { normalizeAssetUrl } from "@/lib/asset-url";

function getInitials(name: string) {
    return name
        .split(" ")
        .map((part) => part[0] || "")
        .join("")
        .slice(0, 2)
        .toUpperCase();
}

export function TeamAvatar({
    name,
    avatarUrl,
    size = "md",
}: {
    name: string;
    avatarUrl?: string | null;
    size?: "sm" | "md" | "lg" | "xl";
}) {
    const sizeClasses = {
        sm: "h-10 w-10 text-sm",
        md: "h-12 w-12 text-sm",
        lg: "h-16 w-16 text-lg",
        xl: "h-20 w-20 text-xl",
    } as const;

    const normalizedAvatarUrl = normalizeAssetUrl(avatarUrl);

    if (normalizedAvatarUrl) {
        return (
            <div className="avatar">
                <div className={`relative overflow-hidden rounded-2xl border border-base-300 bg-base-200 ${sizeClasses[size]}`}>
                    <Image src={normalizedAvatarUrl} alt={name} fill unoptimized className="object-cover" />
                </div>
            </div>
        );
    }

    return (
        <div className="avatar placeholder">
            <div className={`flex items-center justify-center rounded-2xl bg-primary text-center text-primary-content ${sizeClasses[size]}`}>
                <span className="font-bold">{getInitials(name)}</span>
            </div>
        </div>
    );
}
