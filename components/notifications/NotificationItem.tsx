"use client";

import Link from "next/link";
import { Bell, ShieldCheck, UserMinus, UserPlus, Users, X } from "lucide-react";
import { useState } from "react";

export type NotificationView = {
    id: string;
    type: string;
    title: string;
    message: string;
    link: string | null;
    isRead: boolean;
    createdAt: string;
};

function formatTime(value: string) {
    return new Date(value).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function getInviteId(link?: string | null) {
    if (!link) return null;
    try {
        const url = new URL(link, window.location.origin);
        return url.searchParams.get("inviteId");
    } catch {
        return null;
    }
}

export function NotificationItem({
    notification,
    onRead,
    onDelete,
}: {
    notification: NotificationView;
    onRead: (id: string) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}) {
    const [loading, setLoading] = useState(false);

    const inviteId = notification.type === "TEAM_INVITE" ? getInviteId(notification.link) : null;

    const getIcon = () => {
        switch (notification.type) {
            case "TEAM_INVITE":
                return <UserPlus className="h-4 w-4" />;
            case "TEAM_JOIN_REQUEST":
                return <Users className="h-4 w-4" />;
            case "TEAM_ROLE_CHANGED":
                return <ShieldCheck className="h-4 w-4" />;
            case "TEAM_MEMBER_REMOVED":
                return <UserMinus className="h-4 w-4" />;
            default:
                return <Bell className="h-4 w-4" />;
        }
    };

    const handleRead = async () => {
        if (notification.isRead || loading) return;
        setLoading(true);
        await onRead(notification.id);
        setLoading(false);
    };

    const handleInviteAction = async (action: "accept" | "decline") => {
        if (!inviteId) return;
        setLoading(true);
        await fetch(`/api/team/invite/${action}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ inviteId }),
        });
        await onRead(notification.id);
        setLoading(false);
    };

    return (
        <div
            className={`group rounded-box border p-3 transition-all duration-150 ${
                notification.isRead
                    ? "border-base-300 bg-base-100 hover:border-base-400 hover:-translate-y-0.5"
                    : "border-primary/30 bg-primary/10 shadow-sm ring-1 ring-primary/10 hover:border-primary/50 hover:bg-primary/15 hover:-translate-y-0.5"
            }`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-box bg-base-200/80 text-base-content/70 transition group-hover:bg-base-200">
                        {getIcon()}
                    </div>
                    <div className="space-y-1">
                        <div className="text-sm font-semibold text-base-content">{notification.title}</div>
                        <div className="text-xs text-base-content/70">{notification.message}</div>
                        <div className="text-[10px] text-base-content/45">{formatTime(notification.createdAt)}</div>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {!notification.isRead ? (
                        <span className="badge badge-primary badge-xs border-primary/30 bg-primary/15 text-primary">
                            baru
                        </span>
                    ) : null}
                    <button
                        type="button"
                        className="btn btn-ghost btn-xs btn-circle opacity-60 transition hover:opacity-100"
                        onClick={() => onDelete(notification.id)}
                        disabled={loading}
                        aria-label="Hapus notifikasi"
                        title="Hapus"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
                {notification.link ? (
                    <Link href={notification.link} className="btn btn-ghost btn-xs" onClick={handleRead}>
                        Buka
                    </Link>
                ) : null}
                {!notification.isRead ? (
                    <button type="button" className="btn btn-outline btn-xs" onClick={handleRead} disabled={loading}>
                        Tandai dibaca
                    </button>
                ) : null}
                {notification.type === "TEAM_INVITE" && inviteId ? (
                    <>
                        <button type="button" className="btn btn-primary btn-xs" onClick={() => handleInviteAction("accept")} disabled={loading}>
                            Terima
                        </button>
                        <button type="button" className="btn btn-outline btn-error btn-xs" onClick={() => handleInviteAction("decline")} disabled={loading}>
                            Tolak
                        </button>
                    </>
                ) : null}
            </div>
        </div>
    );
}
