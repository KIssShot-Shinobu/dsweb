"use client";

import { NotificationItem, type NotificationView } from "./NotificationItem";
import { useLocale } from "@/hooks/use-locale";

export function NotificationDropdown({
    notifications,
    loading,
    onRead,
    onReadAll,
    onDelete,
}: {
    notifications: NotificationView[];
    loading: boolean;
    onRead: (id: string) => Promise<void>;
    onReadAll: () => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}) {
    const { t } = useLocale();

    return (
        <div className="dropdown-content z-[70] mt-3 w-[22rem] max-w-[calc(100vw-2rem)] rounded-box border border-base-300 bg-base-100/95 p-3 shadow-xl backdrop-blur sm:w-[26rem] sm:p-4">
            <div className="flex items-center justify-between gap-3 border-b border-base-200 pb-3">
                <div>
                    <div className="text-sm font-semibold text-base-content">{t.notifications.title}</div>
                    <div className="text-xs text-base-content/60">{t.notifications.subtitle}</div>
                </div>
                <button type="button" className="btn btn-ghost btn-xs" onClick={onReadAll}>
                    {t.notifications.markAll}
                </button>
            </div>

            <div className="mt-4 max-h-[70vh] space-y-3 overflow-y-auto pr-1">
                {loading ? (
                    <div className="space-y-2">
                        {[1, 2, 3].map((item) => (
                            <div key={item} className="skeleton h-16 w-full rounded-box" />
                        ))}
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="rounded-box border border-dashed border-base-300 bg-base-200/40 p-4 text-sm text-base-content/70">
                        {t.notifications.empty}
                    </div>
                ) : (
                    notifications.map((notification) => (
                        <NotificationItem
                            key={notification.id}
                            notification={notification}
                            onRead={onRead}
                            onDelete={onDelete}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
