"use client";

import { Bell } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NotificationDropdown } from "./NotificationDropdown";
import type { NotificationView } from "./NotificationItem";

export function NotificationBell({ isLoggedIn }: { isLoggedIn: boolean }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [notifications, setNotifications] = useState<NotificationView[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const ref = useRef<HTMLDivElement | null>(null);

    const fetchUnread = useCallback(async () => {
        if (!isLoggedIn) return;
        const response = await fetch("/api/notifications/unread-count");
        const data = await response.json();
        if (response.ok) {
            setUnreadCount(data.count ?? 0);
        }
    }, [isLoggedIn]);

    const fetchNotifications = useCallback(async () => {
        if (!isLoggedIn) return;
        setLoading(true);
        const response = await fetch("/api/notifications?limit=20");
        const data = await response.json();
        if (response.ok) {
            setNotifications(data.notifications ?? []);
        }
        setLoading(false);
    }, [isLoggedIn]);

    const markAsRead = useCallback(async (id: string) => {
        if (!isLoggedIn) return;
        await fetch("/api/notifications/read", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
        });
        setNotifications((current) =>
            current.map((item) => (item.id === id ? { ...item, isRead: true } : item))
        );
        setUnreadCount((current) => Math.max(0, current - 1));
    }, [isLoggedIn]);

    const markAllAsRead = useCallback(async () => {
        if (!isLoggedIn) return;
        await fetch("/api/notifications/read-all", { method: "POST" });
        setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
        setUnreadCount(0);
    }, [isLoggedIn]);

    useEffect(() => {
        if (!isLoggedIn) return;
        const timeoutId = setTimeout(() => {
            fetchUnread();
            fetchNotifications();
        }, 0);

        return () => clearTimeout(timeoutId);
    }, [fetchNotifications, fetchUnread, isLoggedIn]);

    useEffect(() => {
        if (!isLoggedIn) return;
        const eventSource = new EventSource("/api/notifications/stream");

        const onNotification = (event: MessageEvent) => {
            try {
                const payload = JSON.parse(event.data) as NotificationView;
                setNotifications((current) => [payload, ...current].slice(0, 20));
                setUnreadCount((current) => current + 1);
            } catch {
                // ignore malformed payload
            }
        };

        eventSource.addEventListener("notification", onNotification);

        return () => {
            eventSource.close();
        };
    }, [isLoggedIn]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!ref.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const badgeLabel = useMemo(() => (unreadCount > 9 ? "9+" : String(unreadCount)), [unreadCount]);

    if (!isLoggedIn) {
        return null;
    }

    return (
        <div className="dropdown dropdown-end" ref={ref}>
            <button
                type="button"
                onClick={() => setOpen((current) => !current)}
                className="btn btn-ghost btn-circle border border-base-300 bg-base-100/80"
                title="Notifications"
            >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 ? (
                    <span className="badge badge-error badge-xs absolute -right-1 -top-1">{badgeLabel}</span>
                ) : null}
            </button>

            {open ? (
                <NotificationDropdown
                    notifications={notifications}
                    loading={loading}
                    onRead={markAsRead}
                    onReadAll={markAllAsRead}
                />
            ) : null}
        </div>
    );
}
