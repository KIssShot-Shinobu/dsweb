"use client";

import Link from "next/link";
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
}: {
    notification: NotificationView;
    onRead: (id: string) => Promise<void>;
}) {
    const [loading, setLoading] = useState(false);

    const inviteId = notification.type === "TEAM_INVITE" ? getInviteId(notification.link) : null;

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
        <div className={`rounded-box border p-3 transition ${notification.isRead ? "border-base-300 bg-base-100" : "border-primary/30 bg-primary/10"}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                    <div className="text-sm font-semibold text-base-content">{notification.title}</div>
                    <div className="text-xs text-base-content/70">{notification.message}</div>
                    <div className="text-[10px] text-base-content/45">{formatTime(notification.createdAt)}</div>
                </div>
                {!notification.isRead ? <span className="badge badge-primary badge-xs">baru</span> : null}
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
                            Accept
                        </button>
                        <button type="button" className="btn btn-outline btn-error btn-xs" onClick={() => handleInviteAction("decline")} disabled={loading}>
                            Decline
                        </button>
                    </>
                ) : null}
            </div>
        </div>
    );
}
